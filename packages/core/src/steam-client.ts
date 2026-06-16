/**
 * Typed wrapper around Steam's public (keyless) storefront + community endpoints
 * for the cross-platform "replicate-this" radar. Mirrors `RobloxClient`'s shape:
 * transport-agnostic, configured via constructor options (cache, retry budget,
 * dispatcher) so `undici`'s `MockAgent` plugs in for unit tests and nothing
 * reads env vars.
 *
 * All methods normalize Steam's raw JSON into small typed shapes so the pipeline
 * stage (`pipeline/steam-breakouts.ts`) never touches Steam's wire format.
 */
import { type Dispatcher, request } from "undici";
import { BloxscoutCache, CACHE_TTL, type CacheTtlSeconds } from "./cache.js";
import { SteamApiError } from "./errors.js";

const DEFAULT_USER_AGENT = "bloxscout/0.2 (+https://github.com/IvanKuria/bloxscout)";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;

/** Featured-category buckets we treat as "going viral now" candidates. */
const CANDIDATE_LISTS = ["new_releases", "top_sellers", "coming_soon"] as const;

/** Endpoints used by `SteamClient`. Exposed so tests can target them with `MockAgent`. */
export const STEAM_ENDPOINTS = {
  store: "https://store.steampowered.com",
  steamspy: "https://steamspy.com",
  api: "https://api.steampowered.com",
} as const;

export interface SteamClientOptions {
  cache?: BloxscoutCache;
  userAgent?: string;
  requestTimeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Custom undici dispatcher — how `MockAgent` is plugged in for unit tests. */
  dispatcher?: Dispatcher;
}

/** One app surfaced by a featured-category list, with which list(s) it appeared in. */
export interface SteamFeaturedApp {
  appId: number;
  name: string;
  lists: string[];
}

export interface SteamAppDetails {
  appId: number;
  name: string;
  shortDescription: string | null;
  genres: string[];
  releaseDate: string | null;
  comingSoon: boolean;
  /** USD price (final, after discount); 0 for free; null when unknown. */
  priceUsd: number | null;
  headerImageUrl: string | null;
  type: string | null;
}

export interface SteamReviewSummary {
  totalReviews: number;
  totalPositive: number;
  totalNegative: number;
  /** total_positive / total_reviews, or null when there are no reviews. */
  positivePct: number | null;
  reviewScoreDesc: string | null;
}

export interface SteamSpyData {
  ownersLow: number | null;
  ownersHigh: number | null;
  avgPlaytimeMin: number | null;
  /** User tags (highest-voted first) — drive the candidate Roblox-niche mapping. */
  tags: string[];
}

const sleepDefault = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class SteamClient {
  private readonly cache: BloxscoutCache;
  private readonly userAgent: string;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly dispatcher: Dispatcher | undefined;

  constructor(options: SteamClientOptions = {}) {
    this.cache = options.cache ?? new BloxscoutCache();
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.sleep = options.sleep ?? sleepDefault;
    this.dispatcher = options.dispatcher;
  }

  /**
   * Apps from the storefront featured categories (new releases / top sellers /
   * coming soon), deduped by appId with the originating list(s) recorded. This
   * is the candidate set the radar scores for virality.
   */
  async getFeaturedApps(): Promise<SteamFeaturedApp[]> {
    const url = new URL("/api/featuredcategories", STEAM_ENDPOINTS.store);
    url.searchParams.set("cc", "us");
    url.searchParams.set("l", "en");
    const raw = await this.fetchJson<Record<string, unknown>>(url, {
      label: "GET /api/featuredcategories",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: "steam:featuredcategories",
    });

    const byApp = new Map<number, SteamFeaturedApp>();
    for (const list of CANDIDATE_LISTS) {
      const bucket = raw[list] as { items?: unknown[] } | undefined;
      const items = Array.isArray(bucket?.items) ? bucket.items : [];
      for (const item of items) {
        const rec = item as { id?: unknown; name?: unknown; type?: unknown };
        const appId = typeof rec.id === "number" ? rec.id : Number(rec.id);
        if (!Number.isInteger(appId) || appId <= 0) continue;
        // featuredcategories mixes apps + bundles; bundles set `type` non-app.
        const existing = byApp.get(appId);
        if (existing) {
          existing.lists.push(list);
        } else {
          byApp.set(appId, {
            appId,
            name: typeof rec.name === "string" ? rec.name : String(appId),
            lists: [list],
          });
        }
      }
    }
    return [...byApp.values()];
  }

  /** Normalized store metadata for one app, or null when the app has no public store page. */
  async getAppDetails(appId: number): Promise<SteamAppDetails | null> {
    const url = new URL("/api/appdetails", STEAM_ENDPOINTS.store);
    url.searchParams.set("appids", String(appId));
    url.searchParams.set("cc", "us");
    url.searchParams.set("l", "en");
    const raw = await this.fetchJson<Record<string, { success?: boolean; data?: unknown }>>(url, {
      label: `GET /api/appdetails?appids=${appId}`,
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `steam:appdetails:${appId}`,
    });
    const entry = raw[String(appId)];
    if (!entry?.success || !entry.data) return null;
    const d = entry.data as {
      name?: string;
      short_description?: string;
      genres?: Array<{ description?: string }>;
      release_date?: { date?: string; coming_soon?: boolean };
      price_overview?: { final?: number };
      is_free?: boolean;
      header_image?: string;
      type?: string;
    };
    return {
      appId,
      name: d.name ?? String(appId),
      shortDescription: d.short_description ?? null,
      genres: (d.genres ?? []).map((g) => g.description).filter((s): s is string => Boolean(s)),
      releaseDate: d.release_date?.date ?? null,
      comingSoon: Boolean(d.release_date?.coming_soon),
      priceUsd: d.is_free
        ? 0
        : typeof d.price_overview?.final === "number"
          ? d.price_overview.final / 100
          : null,
      headerImageUrl: d.header_image ?? null,
      type: d.type ?? null,
    };
  }

  /** Review totals + positive fraction (the primary "going viral now" signal). */
  async getReviewSummary(appId: number): Promise<SteamReviewSummary | null> {
    const url = new URL(`/appreviews/${appId}`, STEAM_ENDPOINTS.store);
    url.searchParams.set("json", "1");
    url.searchParams.set("language", "all");
    url.searchParams.set("purchase_type", "all");
    url.searchParams.set("num_per_page", "0");
    const raw = await this.fetchJson<{
      success?: number;
      query_summary?: {
        total_reviews?: number;
        total_positive?: number;
        total_negative?: number;
        review_score_desc?: string;
      };
    }>(url, {
      label: `GET /appreviews/${appId}`,
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `steam:reviews:${appId}`,
    });
    const s = raw.query_summary;
    if (!s) return null;
    const totalReviews = s.total_reviews ?? 0;
    const totalPositive = s.total_positive ?? 0;
    return {
      totalReviews,
      totalPositive,
      totalNegative: s.total_negative ?? 0,
      positivePct: totalReviews > 0 ? totalPositive / totalReviews : null,
      reviewScoreDesc: s.review_score_desc ?? null,
    };
  }

  /** SteamSpy ownership band, avg playtime, and user tags. Best-effort. */
  async getSteamSpy(appId: number): Promise<SteamSpyData | null> {
    const url = new URL("/api.php", STEAM_ENDPOINTS.steamspy);
    url.searchParams.set("request", "appdetails");
    url.searchParams.set("appid", String(appId));
    const raw = await this.fetchJson<{
      owners?: string;
      average_forever?: number;
      tags?: Record<string, number> | unknown[];
    }>(url, {
      label: `GET steamspy appdetails ${appId}`,
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `steam:steamspy:${appId}`,
    });
    if (!raw || typeof raw !== "object") return null;
    const [ownersLow, ownersHigh] = parseOwnersBand(raw.owners);
    const tags =
      raw.tags && !Array.isArray(raw.tags)
        ? Object.entries(raw.tags)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
        : [];
    return {
      ownersLow,
      ownersHigh,
      avgPlaytimeMin: typeof raw.average_forever === "number" ? raw.average_forever : null,
      tags,
    };
  }

  /** Live concurrent player count, or null when unavailable. */
  async getCurrentPlayers(appId: number): Promise<number | null> {
    const url = new URL("/ISteamUserStats/GetNumberOfCurrentPlayers/v1/", STEAM_ENDPOINTS.api);
    url.searchParams.set("appid", String(appId));
    const raw = await this.fetchJson<{ response?: { result?: number; player_count?: number } }>(
      url,
      {
        label: `GET GetNumberOfCurrentPlayers ${appId}`,
        ttlSeconds: CACHE_TTL.LIVE,
        cacheKey: `steam:players:${appId}`,
      },
    );
    if (raw.response?.result !== 1) return null;
    return typeof raw.response.player_count === "number" ? raw.response.player_count : null;
  }

  // ---------------------------------------------------------------------------
  // Internals (mirrors RobloxClient transport: retry on 429/5xx/network)
  // ---------------------------------------------------------------------------

  private async fetchJson<T>(
    url: URL | string,
    opts: { label: string; ttlSeconds?: CacheTtlSeconds; cacheKey?: string },
  ): Promise<T> {
    if (opts.ttlSeconds !== undefined && opts.cacheKey !== undefined) {
      return this.cache.get<T>(
        opts.cacheKey,
        () => this.fetchJsonUncached<T>(url, opts.label),
        opts.ttlSeconds,
      );
    }
    return this.fetchJsonUncached<T>(url, opts.label);
  }

  private async fetchJsonUncached<T>(url: URL | string, label: string): Promise<T> {
    const endpoint = typeof url === "string" ? url : url.toString();
    let attempt = 0;
    while (true) {
      let response: Awaited<ReturnType<typeof request>>;
      try {
        response = await request(endpoint, {
          method: "GET",
          headers: { accept: "application/json", "user-agent": this.userAgent },
          headersTimeout: this.requestTimeoutMs,
          bodyTimeout: this.requestTimeoutMs,
          ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
        });
      } catch (err) {
        if (attempt < this.maxRetries) {
          await this.sleep(backoffDelayMs(attempt));
          attempt++;
          continue;
        }
        throw new SteamApiError(`${label} failed: ${(err as Error).message}`, {
          statusCode: 0,
          endpoint,
        });
      }

      const { statusCode, body, headers } = response;
      const text = await body.text();

      if (statusCode >= 200 && statusCode < 300) {
        if (text.length === 0) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch (err) {
          throw new SteamApiError(`${label}: failed to parse JSON: ${(err as Error).message}`, {
            statusCode,
            endpoint,
            body: text.slice(0, 500),
          });
        }
      }

      if (statusCode === 429) {
        const retryAfter = parseRetryAfterSeconds(headers["retry-after"]);
        if (attempt < this.maxRetries) {
          await this.sleep(retryAfter !== undefined ? retryAfter * 1000 : backoffDelayMs(attempt));
          attempt++;
          continue;
        }
        throw new SteamApiError(`${label}: rate limited`, { statusCode, endpoint, body: text });
      }

      if (statusCode >= 500 && statusCode <= 599) {
        if (attempt < this.maxRetries) {
          await this.sleep(backoffDelayMs(attempt));
          attempt++;
          continue;
        }
        throw new SteamApiError(`${label}: server error ${statusCode}`, {
          statusCode,
          endpoint,
          body: text,
        });
      }

      throw new SteamApiError(`${label}: HTTP ${statusCode}`, { statusCode, endpoint, body: text });
    }
  }
}

/** Parse SteamSpy's `"1,000,000 .. 2,000,000"` owners band into `[low, high]`. */
export function parseOwnersBand(owners: string | undefined): [number | null, number | null] {
  if (!owners) return [null, null];
  const parts = owners.split("..").map((p) => Number(p.replace(/[,\s]/g, "")));
  const low = Number.isFinite(parts[0]) ? (parts[0] as number) : null;
  const high = Number.isFinite(parts[1]) ? (parts[1] as number) : low;
  return [low, high];
}

/** Exponential backoff with full jitter: base 200ms * 2^attempt, capped at 5s. */
function backoffDelayMs(attempt: number): number {
  const base = Math.min(5_000, 200 * 2 ** attempt);
  return Math.floor(Math.random() * base);
}

function parseRetryAfterSeconds(header: string | string[] | undefined): number | undefined {
  if (header === undefined) return undefined;
  const value = Array.isArray(header) ? header[0] : header;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : undefined;
}
