/**
 * Read-side client for the hosted `bloxscout-data` dataset.
 *
 * Plain HTTPS GETs against a static-file CDN (GitHub raw by default) — no
 * API keys, no SDKs. Every method returns `null` on ANY failure (network,
 * HTTP status, gzip, JSON, schema): hosted data is strictly additive on top
 * of the local snapshot store, so offline / blocked / stale-CDN behavior
 * degrades to exactly what bloxscout did before hosted data existed.
 *
 * Env knobs:
 *  - `BLOXSCOUT_HOSTED_BASE_URL` — point at a mirror or a local dry-run dir
 *    served over HTTP.
 *  - `BLOXSCOUT_NO_HOSTED=1` — disable hosted reads entirely.
 */

import { gunzipSync } from "node:zlib";
import { type Dispatcher, request } from "undici";
import { BloxscoutCache, CACHE_TTL } from "./cache.js";
import {
  type GameHistoryEntry,
  type GenreRevenueView,
  GenreRevenueViewSchema,
  type GenresView,
  GenresViewSchema,
  HOSTED_PATHS,
  HistoryShardSchema,
  type MetaFile,
  MetaFileSchema,
  type RankedView,
  RankedViewSchema,
  type RegistryEntry,
  type RegistryFile,
  RegistryFileSchema,
  type RisingNichesView,
  RisingNichesViewSchema,
  type SaturationView,
  SaturationViewSchema,
  shardOf,
} from "./hosted-format.js";

export const DEFAULT_HOSTED_BASE_URL =
  "https://raw.githubusercontent.com/IvanKuria/bloxscout-data/main/";

const DEFAULT_TIMEOUT_MS = 10_000;

export interface HostedDataClientOptions {
  /** Dataset root URL (must end with `/`). Default: GitHub raw, or `BLOXSCOUT_HOSTED_BASE_URL`. */
  baseUrl?: string;
  cache?: BloxscoutCache;
  userAgent?: string;
  requestTimeoutMs?: number;
  /** Custom undici dispatcher — how MockAgent is injected in tests. */
  dispatcher?: Dispatcher;
}

/** True unless the user opted out via `BLOXSCOUT_NO_HOSTED=1`. */
export function hostedDataEnabled(): boolean {
  return process.env.BLOXSCOUT_NO_HOSTED !== "1";
}

export class HostedDataClient {
  private readonly baseUrl: string;
  private readonly cache: BloxscoutCache;
  private readonly userAgent: string;
  private readonly requestTimeoutMs: number;
  private readonly dispatcher: Dispatcher | undefined;

  constructor(options: HostedDataClientOptions = {}) {
    const envBase = process.env.BLOXSCOUT_HOSTED_BASE_URL;
    const base = options.baseUrl ?? (envBase && envBase.length > 0 ? envBase : undefined);
    this.baseUrl = base ?? DEFAULT_HOSTED_BASE_URL;
    this.cache = options.cache ?? new BloxscoutCache();
    this.userAgent =
      options.userAgent ?? "bloxscout/0.2.0 (+https://github.com/IvanKuria/bloxscout)";
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.dispatcher = options.dispatcher;
  }

  /** Freshness probe: `generatedAt` tells you how stale the dataset is. */
  async getMeta(): Promise<MetaFile | null> {
    return this.fetchValidated(HOSTED_PATHS.meta, MetaFileSchema, CACHE_TTL.LIVE);
  }

  async getTrendingView(): Promise<RankedView | null> {
    return this.fetchValidated(HOSTED_PATHS.trendingView, RankedViewSchema, CACHE_TTL.DEFAULT);
  }

  async getUpAndComingView(): Promise<RankedView | null> {
    return this.fetchValidated(HOSTED_PATHS.upAndComingView, RankedViewSchema, CACHE_TTL.DEFAULT);
  }

  async getBreakoutsView(): Promise<RankedView | null> {
    return this.fetchValidated(HOSTED_PATHS.breakoutsView, RankedViewSchema, CACHE_TTL.DEFAULT);
  }

  async getGenresView(): Promise<GenresView | null> {
    return this.fetchValidated(HOSTED_PATHS.genresView, GenresViewSchema, CACHE_TTL.DEFAULT);
  }

  /**
   * Genre saturation / white-space view. `null` until the pipeline publishes
   * it (only after this branch merges and the cron runs) — callers must treat
   * `null` as "rankings still computing", not an error.
   */
  async getSaturationView(): Promise<SaturationView | null> {
    return this.fetchValidated(
      HOSTED_PATHS.saturationView,
      SaturationViewSchema,
      CACHE_TTL.DEFAULT,
    );
  }

  /** Rising-niches momentum view. `null` until first published (see above). */
  async getRisingNichesView(): Promise<RisingNichesView | null> {
    return this.fetchValidated(
      HOSTED_PATHS.risingNichesView,
      RisingNichesViewSchema,
      CACHE_TTL.DEFAULT,
    );
  }

  /** Per-genre revenue-estimate view. `null` until first published (see above). */
  async getGenreRevenueView(): Promise<GenreRevenueView | null> {
    return this.fetchValidated(
      HOSTED_PATHS.genreRevenueView,
      GenreRevenueViewSchema,
      CACHE_TTL.DEFAULT,
    );
  }

  /** Hosted time-series for one game, or `null` if untracked/unavailable. */
  async getGameHistory(universeId: number): Promise<GameHistoryEntry | null> {
    const shard = await this.fetchValidated(
      HOSTED_PATHS.historyShard(shardOf(universeId)),
      HistoryShardSchema,
      CACHE_TTL.SLOW,
    );
    return shard?.games[String(universeId)] ?? null;
  }

  /**
   * The full game registry, or `null` if unavailable. Carries per-game
   * `createdAt` (game age), `lastUpdatedAt` + `updateCount` (dev ship cadence),
   * and label/genre. Cached on the SLOW bucket — the registry moves slowly.
   */
  async getRegistry(): Promise<RegistryFile | null> {
    return this.fetchValidated(
      HOSTED_PATHS.registry,
      RegistryFileSchema,
      CACHE_TTL.SLOW,
    );
  }

  /** One game's registry entry by universe id, or `null` when absent. */
  async getRegistryEntry(universeId: number): Promise<RegistryEntry | null> {
    const registry = await this.getRegistry();
    return registry?.games[String(universeId)] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async fetchValidated<T>(
    path: string,
    schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
    ttlSeconds: number,
  ): Promise<T | null> {
    try {
      const raw = await this.cache.get(`hosted:${path}`, () => this.fetchRaw(path), ttlSeconds);
      const parsed = schema.safeParse(raw);
      return parsed.success ? (parsed.data as T) : null;
    } catch {
      return null;
    }
  }

  private async fetchRaw(path: string): Promise<unknown> {
    const url = new URL(path, this.baseUrl).toString();
    const response = await request(url, {
      method: "GET",
      headers: { "user-agent": this.userAgent },
      headersTimeout: this.requestTimeoutMs,
      bodyTimeout: this.requestTimeoutMs,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    if (response.statusCode < 200 || response.statusCode >= 300) {
      await response.body.dump();
      throw new Error(`hosted data: HTTP ${response.statusCode} for ${path}`);
    }
    const buf = Buffer.from(await response.body.arrayBuffer());
    const json = path.endsWith(".gz") ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    return JSON.parse(json);
  }
}
