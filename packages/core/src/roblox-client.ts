import { randomUUID } from "node:crypto";
import { type Dispatcher, request } from "undici";
import { BloxscoutCache, CACHE_TTL, type CacheTtlSeconds } from "./cache.js";
import {
  BloxscoutError,
  RobloxApiError,
  RobloxNotFoundError,
  RobloxRateLimitError,
} from "./errors.js";
import type {
  Badge,
  CreatorGame,
  Game,
  GameIcon,
  GameIconSize,
  GamePass,
  GamePlayerCount,
  GameRecommendation,
  GameSummary,
  GameVotes,
  Group,
  RobloxUniverseId,
  RobloxUserId,
  User,
} from "./types.js";

const DEFAULT_USER_AGENT = "bloxscout/0.0.1 (+https://github.com/IvanKuria/bloxscout)";
/**
 * Per-request cap for `games.roblox.com/v1/games?universeIds=...`.
 *
 * Roblox tightened the per-request universe-id limit some time after the
 * v0.1.0 cut — requests with 100 ids now fail with
 * `{"code":9,"message":"Too many universe IDs"}`. 50 is the empirically
 * observed safe ceiling and matches what Roblox's own discovery endpoints
 * batch with. See issue #36.
 */
const GAMES_BATCH_SIZE = 50;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Endpoints used by `RobloxClient`. Exposed so tests can target them with
 * `undici`'s `MockAgent` and integration tests can assert URL stability.
 */
export const ROBLOX_ENDPOINTS = {
  omniSearch: "https://apis.roblox.com",
  /** Game-passes listing lives on the apis.roblox.com host (post-2025 migration). */
  gamePasses: "https://apis.roblox.com",
  games: "https://games.roblox.com",
  users: "https://users.roblox.com",
  groups: "https://groups.roblox.com",
  thumbnails: "https://thumbnails.roblox.com",
  badges: "https://badges.roblox.com",
} as const;

export interface RobloxClientOptions {
  /** Override the shared LRU cache (e.g. for tests). */
  cache?: BloxscoutCache;
  /** Custom User-Agent string sent with every outbound request. */
  userAgent?: string;
  /** Per-request timeout, ms. Default 15s. */
  requestTimeoutMs?: number;
  /** Max retries on 5xx / 429. Default 3. Set to 0 to disable. */
  maxRetries?: number;
  /**
   * Sleep function (ms). Injected so tests can fast-forward retry backoff
   * without real timers.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Custom undici dispatcher. When provided, all requests route through it
   * — this is how `MockAgent` is plugged in for unit tests.
   */
  dispatcher?: Dispatcher;
}

export interface SearchGamesOptions {
  /** Max number of results returned (post-trim). Default 25. */
  limit?: number;
}

export interface GetCreatorGamesOptions {
  /** Roblox accepts 10/25/50. Default 50. */
  limit?: 10 | 25 | 50;
  sortOrder?: "Asc" | "Desc";
}

export interface GetExploreSortsOptions {
  /** e.g. `computer`, `high_end_phone`, `console`, `all`. */
  device: string;
  /** ISO 3166 alpha-2 lowercase, or `all`. */
  country: string;
}

/** One game entry from an explore-api Games sort. */
export interface ExploreGame {
  universeId: number;
  rootPlaceId: number;
  name: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
  isSponsored: boolean;
}

export interface ExploreSort {
  sortId: string;
  sortDisplayName: string;
  games: ExploreGame[];
}

interface FetchJsonOptions {
  /** Endpoint label for error messages — e.g. `GET /v1/games`. */
  label: string;
  /** Cache TTL in seconds. If omitted, the call is not cached. */
  ttlSeconds?: CacheTtlSeconds;
  /** Cache key. Required when `ttlSeconds` is provided. */
  cacheKey?: string;
}

const sleepDefault = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Typed wrapper around Roblox's public unauthenticated endpoints.
 *
 * The class is deliberately transport-agnostic — it does not import from the
 * MCP SDK or Commander — so both the MCP server (Phase 2) and the CLI
 * (Phase 3) can construct it directly. Behaviour is controlled through
 * constructor options (cache, retry budget, dispatcher) rather than
 * environment variables.
 */
export class RobloxClient {
  private readonly cache: BloxscoutCache;
  private readonly userAgent: string;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly dispatcher: Dispatcher | undefined;

  constructor(options: RobloxClientOptions = {}) {
    this.cache = options.cache ?? new BloxscoutCache();
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.sleep = options.sleep ?? sleepDefault;
    this.dispatcher = options.dispatcher;
  }

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  /**
   * Search Roblox's catalog by keyword.
   *
   * Backed by `GET https://apis.roblox.com/search-api/omni-search`. The
   * legacy `games.roblox.com/v1/games/list` endpoint now requires an
   * authenticated session and returns `{"errors":[{"code":0,"message":""}]}`
   * for unauthenticated calls — confirmed 2026-05.
   *
   * Returns the `Game`-typed entries flattened across all
   * `searchResults[].contents` groups, trimmed to `opts.limit` (default 25).
   */
  async searchGames(keyword: string, opts: SearchGamesOptions = {}): Promise<GameSummary[]> {
    const trimmed = keyword.trim();
    if (trimmed.length === 0) {
      throw new BloxscoutError("searchGames: keyword must be non-empty", "VALIDATION_ERROR");
    }
    const limit = opts.limit ?? 25;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BloxscoutError("searchGames: limit must be a positive integer", "VALIDATION_ERROR");
    }
    // sessionId is required by the endpoint; rotate per call so we don't pin
    // a single session and bias the results.
    const url = new URL("/search-api/omni-search", ROBLOX_ENDPOINTS.omniSearch);
    url.searchParams.set("searchQuery", trimmed);
    url.searchParams.set("pageType", "all");
    url.searchParams.set("sessionId", randomUUID());

    const data = await this.fetchJson<{
      searchResults: Array<{ contentGroupType: string; contents: GameSummary[] }>;
    }>(url, {
      label: "GET /search-api/omni-search",
      ttlSeconds: CACHE_TTL.DEFAULT,
      cacheKey: `omni-search:${trimmed.toLowerCase()}`,
    });

    const games: GameSummary[] = [];
    for (const group of data.searchResults ?? []) {
      if (group.contentGroupType !== "Game") continue;
      for (const entry of group.contents ?? []) {
        games.push(entry);
        if (games.length >= limit) return games;
      }
    }
    return games;
  }

  /**
   * Roblox's home-page discovery sorts ("Top Trending", "Up-and-Coming",
   * "Top Playing Now", …) via `GET /explore-api/v1/get-sorts`.
   *
   * Undocumented but unauthenticated endpoint (confirmed working 2026-06).
   * Each Games-typed sort carries ~80-90 entries with live `playerCount`
   * and vote totals inline; non-game sorts (filter pills, layout rows) are
   * dropped. Results vary by `device` / `country`, which makes a small
   * matrix sweep an effective discovery net for the ingestion pipeline.
   *
   * Not cached: discovery callers want fresh rankings per call, and nothing
   * latency-sensitive sits on this path.
   */
  async getExploreSorts(opts: GetExploreSortsOptions): Promise<ExploreSort[]> {
    const url = new URL("/explore-api/v1/get-sorts", ROBLOX_ENDPOINTS.omniSearch);
    url.searchParams.set("sessionId", randomUUID());
    url.searchParams.set("device", opts.device);
    url.searchParams.set("country", opts.country);
    const data = await this.fetchJson<{
      sorts?: Array<{
        contentType?: string;
        sortId?: string;
        sortDisplayName?: string;
        games?: ExploreGame[];
      }>;
    }>(url, { label: "GET /explore-api/v1/get-sorts" });

    const sorts: ExploreSort[] = [];
    for (const sort of data.sorts ?? []) {
      if (sort.contentType !== "Games") continue;
      sorts.push({
        sortId: sort.sortId ?? "",
        sortDisplayName: sort.sortDisplayName ?? "",
        games: sort.games ?? [],
      });
    }
    return sorts;
  }

  // ---------------------------------------------------------------------------
  // Game intelligence
  // ---------------------------------------------------------------------------

  /**
   * Fetch full game detail for each universe id. Roblox caps the
   * `universeIds` query param at 100 ids per request, so we chunk
   * transparently. Results follow the order of `universeIds`; missing ids
   * are simply absent from the result.
   */
  async getGames(universeIds: RobloxUniverseId[]): Promise<Game[]> {
    if (universeIds.length === 0) return [];
    const unique = [...new Set(universeIds)];
    const chunks: number[][] = [];
    for (let i = 0; i < unique.length; i += GAMES_BATCH_SIZE) {
      chunks.push(unique.slice(i, i + GAMES_BATCH_SIZE));
    }

    const byId = new Map<RobloxUniverseId, Game>();
    for (const chunk of chunks) {
      const url = new URL("/v1/games", ROBLOX_ENDPOINTS.games);
      url.searchParams.set("universeIds", chunk.join(","));
      const data = await this.fetchJson<{ data: Game[] }>(url, {
        label: "GET /v1/games",
        ttlSeconds: CACHE_TTL.SLOW,
        cacheKey: `games:${chunk
          .slice()
          .sort((a, b) => a - b)
          .join(",")}`,
      });
      for (const game of data.data ?? []) {
        byId.set(game.id, game);
      }
    }

    const ordered: Game[] = [];
    for (const id of universeIds) {
      const g = byId.get(id);
      if (g !== undefined) ordered.push(g);
    }
    return ordered;
  }

  /**
   * Live-presence projection over `getGames`. Same endpoint; we cache the
   * projection separately with a tighter TTL so callers asking only about
   * CCU don't get stale metadata locked in.
   */
  async getPlayerCounts(universeIds: RobloxUniverseId[]): Promise<GamePlayerCount[]> {
    const games = await this.getGames(universeIds);
    return games.map((g) => ({ universeId: g.id, playing: g.playing, visits: g.visits }));
  }

  /**
   * Up/down vote totals per universe via `GET /v1/games/votes?universeIds=...`.
   * Same per-request id cap as `getGames`, so we chunk transparently at
   * `GAMES_BATCH_SIZE`. The like-ratio derived from this is the cheapest
   * quality signal Roblox exposes unauthenticated. Cached on the SLOW bucket —
   * vote tallies move slowly relative to CCU. Results follow input order;
   * missing ids are simply absent.
   */
  async getGameVotes(universeIds: RobloxUniverseId[]): Promise<GameVotes[]> {
    if (universeIds.length === 0) return [];
    const unique = [...new Set(universeIds)];
    const chunks: number[][] = [];
    for (let i = 0; i < unique.length; i += GAMES_BATCH_SIZE) {
      chunks.push(unique.slice(i, i + GAMES_BATCH_SIZE));
    }

    const byId = new Map<RobloxUniverseId, GameVotes>();
    for (const chunk of chunks) {
      const url = new URL("/v1/games/votes", ROBLOX_ENDPOINTS.games);
      url.searchParams.set("universeIds", chunk.join(","));
      const data = await this.fetchJson<{
        data?: Array<{ id?: number; upVotes?: number; downVotes?: number }>;
      }>(url, {
        label: "GET /v1/games/votes",
        ttlSeconds: CACHE_TTL.SLOW,
        cacheKey: `votes:${chunk
          .slice()
          .sort((a, b) => a - b)
          .join(",")}`,
      });
      for (const v of data.data ?? []) {
        if (typeof v.id !== "number") continue;
        byId.set(v.id, {
          universeId: v.id,
          upVotes: typeof v.upVotes === "number" ? v.upVotes : 0,
          downVotes: typeof v.downVotes === "number" ? v.downVotes : 0,
        });
      }
    }

    const ordered: GameVotes[] = [];
    for (const id of universeIds) {
      const v = byId.get(id);
      if (v !== undefined) ordered.push(v);
    }
    return ordered;
  }

  /**
   * Roblox's own "similar games" recommendations for a universe via
   * `GET /v1/games/recommendations/game/{universeId}?maxRows=N`. Unauthenticated
   * (confirmed 2026-06). Each entry carries live CCU + vote totals + creator
   * inline, so this single request yields a full competitor cohort. Cached on
   * the DEFAULT bucket — the graph shifts on the order of hours, not minutes.
   * Sponsored rows are dropped (they're ad placements, not true neighbours).
   */
  async getRecommendations(
    universeId: RobloxUniverseId,
    opts: { maxRows?: number } = {},
  ): Promise<GameRecommendation[]> {
    if (!Number.isInteger(universeId) || universeId < 1) {
      throw new BloxscoutError(
        "getRecommendations: universeId must be a positive integer",
        "VALIDATION_ERROR",
      );
    }
    const maxRows = Math.max(1, Math.min(50, Math.round(opts.maxRows ?? 20)));
    const url = new URL(`/v1/games/recommendations/game/${universeId}`, ROBLOX_ENDPOINTS.games);
    url.searchParams.set("maxRows", String(maxRows));
    const data = await this.fetchJson<{
      games?: Array<{
        universeId?: number;
        name?: string;
        playerCount?: number;
        totalUpVotes?: number;
        totalDownVotes?: number;
        creatorName?: string;
        creatorType?: string;
        genre?: string;
        canonicalUrlPath?: string;
        isSponsored?: boolean;
      }>;
    }>(url, {
      label: "GET /v1/games/recommendations/game/{id}",
      ttlSeconds: CACHE_TTL.DEFAULT,
      cacheKey: `recommendations:${universeId}:${maxRows}`,
    });

    const out: GameRecommendation[] = [];
    for (const g of data.games ?? []) {
      if (typeof g.universeId !== "number" || g.isSponsored) continue;
      out.push({
        universeId: g.universeId,
        name: g.name ?? "",
        playerCount: typeof g.playerCount === "number" ? g.playerCount : 0,
        totalUpVotes: typeof g.totalUpVotes === "number" ? g.totalUpVotes : 0,
        totalDownVotes: typeof g.totalDownVotes === "number" ? g.totalDownVotes : 0,
        creatorName: g.creatorName ?? "",
        creatorType: g.creatorType ?? "",
        genre: g.genre ?? "",
        ...(g.canonicalUrlPath ? { canonicalUrlPath: g.canonicalUrlPath } : {}),
      });
    }
    return out;
  }

  /**
   * A universe's badges with award statistics via
   * `GET https://badges.roblox.com/v1/universes/{id}/badges?limit=N`.
   * Unauthenticated (confirmed 2026-06). `statistics.awardedCount` is embedded
   * inline, so one request yields a progression funnel — no per-badge stats
   * call needed. Returns the first page only (cap 100), which covers virtually
   * every game's badge set. Cached on the SLOW bucket — award counts drift
   * slowly. Sorted by award count descending so the earliest/most-reached
   * milestones lead.
   */
  async getUniverseBadges(
    universeId: RobloxUniverseId,
    opts: { limit?: number } = {},
  ): Promise<Badge[]> {
    if (!Number.isInteger(universeId) || universeId < 1) {
      throw new BloxscoutError(
        "getUniverseBadges: universeId must be a positive integer",
        "VALIDATION_ERROR",
      );
    }
    const limit = Math.max(1, Math.min(100, Math.round(opts.limit ?? 100)));
    const url = new URL(`/v1/universes/${universeId}/badges`, ROBLOX_ENDPOINTS.badges);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sortOrder", "Asc");
    const data = await this.fetchJson<{
      data?: Array<{
        id?: number;
        name?: string;
        enabled?: boolean;
        created?: string;
        statistics?: {
          pastDayAwardedCount?: number;
          awardedCount?: number;
          winRatePercentage?: number;
        };
      }>;
    }>(url, {
      label: "GET /v1/universes/{id}/badges",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `badges:${universeId}:${limit}`,
    });

    const out: Badge[] = [];
    for (const b of data.data ?? []) {
      if (typeof b.id !== "number") continue;
      out.push({
        id: b.id,
        name: b.name ?? "",
        enabled: b.enabled ?? false,
        awardedCount:
          typeof b.statistics?.awardedCount === "number" ? b.statistics.awardedCount : 0,
        pastDayAwardedCount:
          typeof b.statistics?.pastDayAwardedCount === "number"
            ? b.statistics.pastDayAwardedCount
            : 0,
        winRate:
          typeof b.statistics?.winRatePercentage === "number" ? b.statistics.winRatePercentage : 0,
        created: b.created ?? "",
      });
    }
    out.sort((a, b) => b.awardedCount - a.awardedCount);
    return out;
  }

  /**
   * Game icons / thumbnails. Default size is 512x512 PNG, non-circular.
   */
  async getGameIcons(
    universeIds: RobloxUniverseId[],
    size: GameIconSize = "512x512",
  ): Promise<GameIcon[]> {
    if (universeIds.length === 0) return [];
    const unique = [...new Set(universeIds)];
    const url = new URL("/v1/games/icons", ROBLOX_ENDPOINTS.thumbnails);
    url.searchParams.set("universeIds", unique.join(","));
    url.searchParams.set("size", size);
    url.searchParams.set("format", "Png");
    url.searchParams.set("isCircular", "false");
    const data = await this.fetchJson<{ data: GameIcon[] }>(url, {
      label: "GET /v1/games/icons",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `icons:${size}:${unique
        .slice()
        .sort((a, b) => a - b)
        .join(",")}`,
    });
    return data.data ?? [];
  }

  /**
   * Game passes (monetization) for a single universe, normalized to
   * `{ id, name, price }` where `price` is Robux (`null` = off-sale).
   *
   * Endpoint: `GET apis.roblox.com/game-passes/v1/universes/{id}/game-passes?passView=Full&pageSize=100`.
   * This replaced the legacy `games.roblox.com/v1/games/{id}/game-passes`,
   * which Roblox deprecated 2025-08-31. The legacy path returned
   * `{ data: [...] }`; the current one returns `{ gamePasses: [...] }`. We
   * accept either envelope so a future Roblox flip-flop doesn't silently
   * empty the data. Public reachability of the apis.roblox.com path is not
   * guaranteed unauthenticated — the pipeline keeps the sampling behind a
   * flag (see `pipeline/gamepasses.ts`).
   *
   * Only the first page (cap 100 passes) is fetched: that covers virtually
   * every game's catalog and keeps this a single request. Cached on the
   * SLOW bucket since pricing changes rarely.
   */
  async getGamePasses(universeId: RobloxUniverseId): Promise<GamePass[]> {
    if (!Number.isInteger(universeId) || universeId < 1) {
      throw new BloxscoutError(
        "getGamePasses: universeId must be a positive integer",
        "VALIDATION_ERROR",
      );
    }
    const url = new URL(
      `/game-passes/v1/universes/${universeId}/game-passes`,
      ROBLOX_ENDPOINTS.gamePasses,
    );
    url.searchParams.set("passView", "Full");
    url.searchParams.set("pageSize", "100");
    const data = await this.fetchJson<{
      gamePasses?: Array<{ id?: number; name?: string; price?: number | null }>;
      data?: Array<{ id?: number; name?: string; price?: number | null }>;
    }>(url, {
      label: "GET /game-passes/v1/universes/{id}/game-passes",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `game-passes:${universeId}`,
    });

    const raw = data.gamePasses ?? data.data ?? [];
    const passes: GamePass[] = [];
    for (const p of raw) {
      if (typeof p.id !== "number") continue;
      passes.push({
        id: p.id,
        name: p.name ?? "",
        price: typeof p.price === "number" ? p.price : null,
      });
    }
    return passes;
  }

  // ---------------------------------------------------------------------------
  // Creator and community
  // ---------------------------------------------------------------------------

  /** User-style creator lookup. */
  async getCreator(userId: RobloxUserId): Promise<User> {
    if (!Number.isInteger(userId) || userId < 1) {
      throw new BloxscoutError("getCreator: userId must be a positive integer", "VALIDATION_ERROR");
    }
    const url = new URL(`/v1/users/${userId}`, ROBLOX_ENDPOINTS.users);
    return this.fetchJson<User>(url, {
      label: "GET /v1/users/{id}",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `user:${userId}`,
    });
  }

  /** Group metadata, including member count and owner. */
  async getGroup(groupId: number): Promise<Group> {
    if (!Number.isInteger(groupId) || groupId < 1) {
      throw new BloxscoutError("getGroup: groupId must be a positive integer", "VALIDATION_ERROR");
    }
    const url = new URL(`/v1/groups/${groupId}`, ROBLOX_ENDPOINTS.groups);
    return this.fetchJson<Group>(url, {
      label: "GET /v1/groups/{id}",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `group:${groupId}`,
    });
  }

  /**
   * Games published by a user. Roblox's v2 endpoint paginates with
   * cursors; for Phase 1 we expose only the first page (cap 50) — pagination
   * lands in Phase 4 once snapshots need it.
   */
  async getCreatorGames(
    userId: RobloxUserId,
    opts: GetCreatorGamesOptions = {},
  ): Promise<CreatorGame[]> {
    if (!Number.isInteger(userId) || userId < 1) {
      throw new BloxscoutError(
        "getCreatorGames: userId must be a positive integer",
        "VALIDATION_ERROR",
      );
    }
    const limit = opts.limit ?? 50;
    const sortOrder = opts.sortOrder ?? "Asc";
    const url = new URL(`/v2/users/${userId}/games`, ROBLOX_ENDPOINTS.games);
    url.searchParams.set("accessFilter", "Public");
    url.searchParams.set("sortOrder", sortOrder);
    url.searchParams.set("limit", String(limit));
    const data = await this.fetchJson<{ data: CreatorGame[] }>(url, {
      label: "GET /v2/users/{id}/games",
      ttlSeconds: CACHE_TTL.SLOW,
      cacheKey: `creator-games:${userId}:${sortOrder}:${limit}`,
    });
    return data.data ?? [];
  }

  // ---------------------------------------------------------------------------
  // Phase-1 stubs (filled in by later phases)
  // ---------------------------------------------------------------------------

  /**
   * Trending / up-and-coming / top-by-genre ranking depends on a local
   * snapshot store (Phase 4). Phase 1 ships the schemas + this stub so
   * Phase 2's MCP registration can already wire the tool surface.
   */
  getTrendingGames(_opts: { genre?: string; limit?: number } = {}): Promise<Game[]> {
    return Promise.reject(
      new BloxscoutError(
        "getTrendingGames is not implemented in Phase 1 (requires snapshot store)",
        "NOT_IMPLEMENTED",
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async fetchJson<T>(url: URL | string, opts: FetchJsonOptions): Promise<T> {
    const key = opts.cacheKey;
    if (opts.ttlSeconds !== undefined && key !== undefined) {
      return this.cache.get<T>(
        key,
        () => this.fetchJsonUncached<T>(url, opts.label),
        opts.ttlSeconds,
      );
    }
    return this.fetchJsonUncached<T>(url, opts.label);
  }

  private async fetchJsonUncached<T>(url: URL | string, label: string): Promise<T> {
    const endpoint = typeof url === "string" ? url : url.toString();
    let attempt = 0;
    // attempt 0 + maxRetries retries = up to maxRetries + 1 total tries.
    while (true) {
      let response: Awaited<ReturnType<typeof request>>;
      try {
        response = await request(endpoint, {
          method: "GET",
          headers: {
            accept: "application/json",
            "user-agent": this.userAgent,
          },
          headersTimeout: this.requestTimeoutMs,
          bodyTimeout: this.requestTimeoutMs,
          ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
        });
      } catch (err) {
        // Network-level failure — treat as retryable.
        if (attempt < this.maxRetries) {
          await this.sleep(backoffDelayMs(attempt));
          attempt++;
          continue;
        }
        throw new RobloxApiError(`${label} failed: ${(err as Error).message}`, {
          statusCode: 0,
          endpoint,
        });
      }

      const { statusCode, body, headers } = response;
      const text = await body.text();

      if (statusCode >= 200 && statusCode < 300) {
        if (text.length === 0) {
          return undefined as T;
        }
        try {
          return JSON.parse(text) as T;
        } catch (err) {
          throw new RobloxApiError(`${label}: failed to parse JSON: ${(err as Error).message}`, {
            statusCode,
            endpoint,
            body: text.slice(0, 500),
          });
        }
      }

      if (statusCode === 404) {
        throw new RobloxNotFoundError(`${label}: not found`, { endpoint, body: text });
      }

      if (statusCode === 429) {
        const retryAfter = parseRetryAfterSeconds(headers["retry-after"]);
        if (attempt < this.maxRetries) {
          const delay = retryAfter !== undefined ? retryAfter * 1000 : backoffDelayMs(attempt);
          await this.sleep(delay);
          attempt++;
          continue;
        }
        throw new RobloxRateLimitError(`${label}: rate limited`, {
          endpoint,
          body: text,
          retryAfterSeconds: retryAfter,
        });
      }

      if (statusCode >= 500 && statusCode <= 599) {
        if (attempt < this.maxRetries) {
          await this.sleep(backoffDelayMs(attempt));
          attempt++;
          continue;
        }
        throw new RobloxApiError(`${label}: server error ${statusCode}`, {
          statusCode,
          endpoint,
          body: text,
        });
      }

      // Other 4xx — fail fast.
      throw new RobloxApiError(`${label}: HTTP ${statusCode}`, {
        statusCode,
        endpoint,
        body: text,
        code: statusCode === 400 ? "ROBLOX_BAD_REQUEST" : "ROBLOX_API_ERROR",
      });
    }
  }
}

/** Exponential backoff with full jitter: base 200ms * 2^attempt, capped at 5s. */
function backoffDelayMs(attempt: number): number {
  const base = Math.min(5_000, 200 * 2 ** attempt);
  return Math.floor(Math.random() * base);
}

function parseRetryAfterSeconds(header: string | string[] | undefined): number | undefined {
  if (header === undefined) return undefined;
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw === undefined) return undefined;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) {
    const delta = Math.max(0, (asDate - Date.now()) / 1000);
    return Math.ceil(delta);
  }
  return undefined;
}
