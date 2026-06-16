/**
 * Wire format of the hosted `bloxscout-data` dataset.
 *
 * The ingestion pipeline (`pipeline/`) writes these files into the
 * `bloxscout-data` repo; `HostedDataClient` (src/core/hosted-data.ts) reads
 * them back over HTTPS. Both sides validate against the same Zod schemas so
 * format drift is caught at the boundary, not deep in tool handlers.
 *
 * Everything lives under a `/v1/` path prefix in the data repo. Schema
 * changes are additive within v1 (rows may gain trailing columns, objects
 * may gain optional fields); breaking changes go to `/v2/`.
 */

import { z } from "zod";

export const HOSTED_SCHEMA_VERSION = 1;

/** Number of per-game history shards: `universeId % HISTORY_SHARD_COUNT`. */
export const HISTORY_SHARD_COUNT = 256;

const isoDateTime = z.string();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

// ---------------------------------------------------------------------------
// Raw run files — v1/raw/YYYY-MM-DD/<runId>.json.gz
// ---------------------------------------------------------------------------

/**
 * `[universeId, playing, visits, favoritedCount, createdMs?, updatedMs?]`
 *
 * The first four columns are the original v1 shape. `createdMs`/`updatedMs`
 * are additive trailing columns (epoch milliseconds of the game's `created`
 * and `updated` ISO timestamps) captured for the breakout-teardown copilot:
 * game age and update cadence. Stored as epoch ms (not ISO strings) to keep
 * raw rows compact. Older rows without them parse unchanged — the rollup
 * layer reads columns positionally and ignores the trailing ones.
 */
export const RawRunRowSchema = z
  .tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])
  .rest(z.number().int());
export type RawRunRow = z.infer<typeof RawRunRowSchema>;

export const RawRunFileSchema = z.object({
  schemaVersion: z.number().int(),
  runId: z.string(),
  takenAt: isoDateTime,
  games: z.array(RawRunRowSchema),
});
export type RawRunFile = z.infer<typeof RawRunFileSchema>;

// ---------------------------------------------------------------------------
// Hourly rollups — v1/hourly/YYYY-MM-DD.json.gz
// ---------------------------------------------------------------------------

/** `[hourUtc 0-23, avgPlaying, peakPlaying, visits, favoritedCount]` */
export const HourlyRowSchema = z.tuple([
  z.number().int().min(0).max(23),
  z.number(),
  z.number().int(),
  z.number().int(),
  z.number().int(),
]);
export type HourlyRow = z.infer<typeof HourlyRowSchema>;

export const HourlyFileSchema = z.object({
  schemaVersion: z.number().int(),
  date: isoDate,
  games: z.record(z.string(), z.array(HourlyRowSchema)),
});
export type HourlyFile = z.infer<typeof HourlyFileSchema>;

// ---------------------------------------------------------------------------
// Daily rollups — v1/daily/YYYY-MM-DD.json.gz
// ---------------------------------------------------------------------------

/** `[avgPlaying, peakPlaying, visitsDelta, favoritedCount]` */
export const DailyRowSchema = z.tuple([z.number(), z.number().int(), z.number(), z.number().int()]);
export type DailyRow = z.infer<typeof DailyRowSchema>;

export const DailyFileSchema = z.object({
  schemaVersion: z.number().int(),
  date: isoDate,
  games: z.record(z.string(), DailyRowSchema),
});
export type DailyFile = z.infer<typeof DailyFileSchema>;

// ---------------------------------------------------------------------------
// History shards — v1/history/<universeId % 256>.json.gz
// ---------------------------------------------------------------------------

/** `[epochMs, avgPlaying, peakPlaying, visits, favoritedCount]` */
export const ShardHourlyPointSchema = z.tuple([
  z.number(),
  z.number(),
  z.number().int(),
  z.number().int(),
  z.number().int(),
]);
/** `[date, avgPlaying, peakPlaying, visitsDelta, favoritedCount]` */
export const ShardDailyPointSchema = z.tuple([
  isoDate,
  z.number(),
  z.number().int(),
  z.number(),
  z.number().int(),
]);

export const GameHistoryEntrySchema = z.object({
  hourly: z.array(ShardHourlyPointSchema),
  daily: z.array(ShardDailyPointSchema),
});
export type GameHistoryEntry = z.infer<typeof GameHistoryEntrySchema>;

export const HistoryShardSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  games: z.record(z.string(), GameHistoryEntrySchema),
});
export type HistoryShard = z.infer<typeof HistoryShardSchema>;

// ---------------------------------------------------------------------------
// Gamepass / monetization samples — v1/gamepasses/YYYY-MM-DD.json
// ---------------------------------------------------------------------------

/**
 * One sampled game pass: `[gamePassId, name, priceRobux | null]`. `price` is
 * `null` for off-sale / unpriced passes. Feeds the breakout-teardown copilot's
 * monetization read. Sampled only for the top-N games when sampling is enabled
 * (see `pipeline/gamepasses.ts`), so coverage is intentionally partial.
 */
export const GamePassRowSchema = z.tuple([
  z.number().int(),
  z.string(),
  z.number().int().nullable(),
]);
export type GamePassRow = z.infer<typeof GamePassRowSchema>;

export const GamePassFileSchema = z.object({
  schemaVersion: z.number().int(),
  date: isoDate,
  /** When this sample was taken. */
  sampledAt: isoDateTime,
  /** universeId -> sampled passes. */
  games: z.record(z.string(), z.array(GamePassRowSchema)),
});
export type GamePassFile = z.infer<typeof GamePassFileSchema>;

// ---------------------------------------------------------------------------
// Registry — v1/registry.json
// ---------------------------------------------------------------------------

export const RegistryEntrySchema = z.object({
  name: z.string().nullable(),
  genre: z.string().nullable(),
  addedAt: isoDateTime,
  /** Last time ingest successfully fetched this game. */
  lastSeenAt: isoDateTime,
  /** Last time a discovery sweep (explore-api / omni-search) surfaced it. */
  lastDiscoveredAt: isoDateTime,
  /** Dormant games are snapshotted once daily instead of every run. */
  tier: z.enum(["active", "dormant"]),
  /**
   * Game's own `created` timestamp (stable; first value we ever observed).
   * Feeds "game age" for the breakout-teardown copilot. Optional/additive:
   * absent on pre-v0.3 registries until the game is re-ingested.
   */
  createdAt: isoDateTime.optional(),
  /** Latest `updated` timestamp observed from games.roblox.com. */
  lastUpdatedAt: isoDateTime.optional(),
  /**
   * Number of distinct `updated`-timestamp changes observed over time — a
   * proxy for how actively the developer ships. Monotonic; starts at 0 the
   * run we first record `lastUpdatedAt`.
   */
  updateCount: z.number().int().optional(),
});
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

export const RegistryFileSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  games: z.record(z.string(), RegistryEntrySchema),
});
export type RegistryFile = z.infer<typeof RegistryFileSchema>;

// ---------------------------------------------------------------------------
// Hot views — v1/views/*.json
// ---------------------------------------------------------------------------

export const ViewEntrySchema = z.object({
  universeId: z.number().int(),
  name: z.string().nullable(),
  genre: z.string().nullable(),
  /** Live CCU at the latest run. */
  playing: z.number().int(),
  avg24h: z.number().nullable(),
  peak24h: z.number().nullable(),
  /**
   * Relative CCU growth over the window. Capped at 1000 (i.e. +100,000%) so
   * zero-baseline launches stay JSON-serializable. `null` = not enough data.
   */
  growth24hPct: z.number().nullable(),
  growth7dPct: z.number().nullable(),
  /** Anomaly score of the trailing 24h vs the game's own prior days, ±10. */
  zScore24h: z.number().nullable(),
  visitsDelta24h: z.number().nullable(),
});
export type ViewEntry = z.infer<typeof ViewEntrySchema>;

export const RankedViewSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  entries: z.array(ViewEntrySchema),
});
export type RankedView = z.infer<typeof RankedViewSchema>;

export const GenreAggregateSchema = z.object({
  genre: z.string(),
  gameCount: z.number().int(),
  totalPlaying: z.number().int(),
  growth24hPct: z.number().nullable(),
  growth7dPct: z.number().nullable(),
  topGames: z.array(
    z.object({
      universeId: z.number().int(),
      name: z.string().nullable(),
      playing: z.number().int(),
    }),
  ),
});
export type GenreAggregate = z.infer<typeof GenreAggregateSchema>;

export const GenresViewSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  genres: z.array(GenreAggregateSchema),
});
export type GenresView = z.infer<typeof GenresViewSchema>;

// ---------------------------------------------------------------------------
// Saturation / gap view — v1/views/saturation.json
// ---------------------------------------------------------------------------

export const SaturationEntrySchema = z.object({
  genre: z.string(),
  gameCount: z.number().int(),
  totalPlaying: z.number().int(),
  /** 0-100, higher = more saturated. `null` when there is too little data. */
  saturationScore: z.number().nullable(),
  /** Low score + enough games = under-served "white space". */
  whiteSpace: z.boolean(),
  components: z.object({
    hhi: z.number(),
    top1Share: z.number(),
    top3Share: z.number(),
    /** `null` while `addedAt` history is too young to judge incumbency. */
    incumbencyScore: z.number().nullable(),
    intensityScore: z.number(),
    playersPerGame: z.number(),
  }),
  /** Why the score is `null`, else `null`. */
  reason: z.string().nullable(),
});
export type SaturationEntry = z.infer<typeof SaturationEntrySchema>;

export const SaturationViewSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  entries: z.array(SaturationEntrySchema),
});
export type SaturationView = z.infer<typeof SaturationViewSchema>;

// ---------------------------------------------------------------------------
// Rising-niches view — v1/views/rising-niches.json
// ---------------------------------------------------------------------------

export const RisingNicheEntrySchema = z.object({
  genre: z.string(),
  /** 0-100 multiplicative momentum × opportunity × durability. */
  risingScore: z.number(),
  growth24hPct: z.number().nullable(),
  growth7dPct: z.number().nullable(),
  saturationScore: z.number().nullable(),
  components: z.object({
    momentum: z.number(),
    opportunity: z.number(),
    durability: z.number(),
    genreZScore: z.number().nullable(),
    top1Share: z.number(),
  }),
  /** `"7d"` once weekly history is reliable; `"24h-only"` before then. */
  durabilityBasis: z.enum(["7d", "24h-only"]),
  topGames: z.array(
    z.object({
      universeId: z.number().int(),
      name: z.string().nullable(),
      playing: z.number().int(),
    }),
  ),
});
export type RisingNicheEntry = z.infer<typeof RisingNicheEntrySchema>;

export const RisingNichesViewSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  entries: z.array(RisingNicheEntrySchema),
});
export type RisingNichesView = z.infer<typeof RisingNichesViewSchema>;

// ---------------------------------------------------------------------------
// Per-genre revenue-estimate view — v1/views/genre-revenue.json
// ---------------------------------------------------------------------------

export const GenreRevenueEntrySchema = z.object({
  genre: z.string(),
  gameCount: z.number().int(),
  totalPlaying: z.number().int(),
  /** Σ of per-game monthly estimates — total addressable. */
  estTotalMonthlyUsd: z.number(),
  /** Median per-game monthly estimate — the typical game. */
  estMedianGameMonthlyUsd: z.number(),
  /** Σ of the top-N earners by playing — headline figure. */
  estTopNMonthlyUsd: z.number(),
  /** Total estimate per 1,000 CCU — efficiency under the assumptions. */
  revenuePerThousandCcuUsd: z.number(),
  /** `true` when a per-genre monetization override was applied. */
  assumptionsOverridden: z.boolean(),
});
export type GenreRevenueEntry = z.infer<typeof GenreRevenueEntrySchema>;

export const GenreRevenueViewSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  confidence: z.literal("low"),
  assumptions: z.object({
    conversionRate: z.number(),
    averageRobuxPerPayingUser: z.number(),
    daysActive: z.number(),
    rateUsdPerRobux: z.number(),
  }),
  disclaimer: z.string(),
  entries: z.array(GenreRevenueEntrySchema),
});
export type GenreRevenueView = z.infer<typeof GenreRevenueViewSchema>;

// ---------------------------------------------------------------------------
// Cross-platform "replicate-this" radar (external sources, Steam-first)
//   - view:    v1/views/steam-breakouts.json   (transient, ranked breakouts)
//   - state:   v1/external/steam/state.json     (prior obs for velocity)
//   - catalog: v1/external/steam/catalog.json   (accumulating, durable SEO)
// ---------------------------------------------------------------------------

const ViralityComponentsSchema = z.object({
  reviewVelocity: z.number(),
  playerVelocity: z.number(),
  recency: z.number(),
  reception: z.number(),
});

export const SteamBreakoutEntrySchema = z.object({
  source: z.literal("steam"),
  appId: z.number().int(),
  name: z.string(),
  storeUrl: z.string(),
  headerImageUrl: z.string().nullable(),
  shortDescription: z.string().nullable(),
  releaseDate: z.string().nullable(),
  ageDays: z.number().nullable(),
  genres: z.array(z.string()),
  /** Steam user tags — drive the candidate Roblox-niche mapping. */
  tags: z.array(z.string()),
  priceUsd: z.number().nullable(),
  // --- signals ---
  reviewTotal: z.number().int().nullable(),
  reviewVelocityPerDay: z.number().nullable(),
  reviewScoreDesc: z.string().nullable(),
  positivePct: z.number().nullable(),
  currentPlayers: z.number().int().nullable(),
  playerVelocityPct: z.number().nullable(),
  ownersLow: z.number().int().nullable(),
  ownersHigh: z.number().int().nullable(),
  // --- ranking ---
  viralityScore: z.number(),
  components: ViralityComponentsSchema,
  /**
   * [0,1] — how clone-able the concept is for a small Roblox dev (cheap +
   * simple + "friend slop" co-op/party traits). AAA titles are filtered out
   * upstream; the view is ranked by virality × replicability.
   */
  replicabilityScore: z.number(),
  /** Honesty flag: `"first-seen"` velocity is launch-to-date, sharpens after a 2nd run. */
  observationBasis: z.enum(["two-snapshot", "first-seen"]),
});
export type SteamBreakoutEntry = z.infer<typeof SteamBreakoutEntrySchema>;

export const SteamBreakoutsViewSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  source: z.literal("steam"),
  disclaimer: z.string(),
  entries: z.array(SteamBreakoutEntrySchema),
});
export type SteamBreakoutsView = z.infer<typeof SteamBreakoutsViewSchema>;

/** Per-app prior observation, keyed by appId, used to compute velocity across runs. */
export const SteamAppStateSchema = z.object({
  name: z.string(),
  firstSeenAt: isoDateTime,
  lastReviewTotal: z.number().int().nullable(),
  lastReviewAt: isoDateTime.nullable(),
  lastPlayers: z.number().int().nullable(),
  lastPlayersAt: isoDateTime.nullable(),
  releaseDate: z.string().nullable(),
  genres: z.array(z.string()),
  tags: z.array(z.string()),
});
export type SteamAppState = z.infer<typeof SteamAppStateSchema>;

export const SteamStateFileSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  apps: z.record(z.string(), SteamAppStateSchema),
});
export type SteamStateFile = z.infer<typeof SteamStateFileSchema>;

/** Durable catalog entry — one per external game ever surfaced; powers `/roblox-version-of/[slug]`. */
export const SteamCatalogEntrySchema = z.object({
  slug: z.string(),
  source: z.literal("steam"),
  appId: z.number().int(),
  name: z.string(),
  storeUrl: z.string(),
  headerImageUrl: z.string().nullable(),
  shortDescription: z.string().nullable(),
  releaseDate: z.string().nullable(),
  genres: z.array(z.string()),
  tags: z.array(z.string()),
  firstSeenAt: isoDateTime,
  lastSeenAt: isoDateTime,
  /** Best virality score observed while on the radar — for ordering catalog pages. */
  bestViralityScore: z.number(),
});
export type SteamCatalogEntry = z.infer<typeof SteamCatalogEntrySchema>;

export const SteamCatalogFileSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoDateTime,
  entries: z.array(SteamCatalogEntrySchema),
});
export type SteamCatalogFile = z.infer<typeof SteamCatalogFileSchema>;

// ---------------------------------------------------------------------------
// Meta — v1/meta.json
// ---------------------------------------------------------------------------

export const MetaFileSchema = z.object({
  schemaVersion: z.number().int(),
  /** `null` only in the pre-first-run scaffold. */
  generatedAt: isoDateTime.nullable(),
  gamesTracked: z.number().int(),
  latestRunId: z.string().nullable(),
});
export type MetaFile = z.infer<typeof MetaFileSchema>;

// ---------------------------------------------------------------------------
// Path helpers (kept beside the schemas so layout and shape evolve together)
// ---------------------------------------------------------------------------

export const HOSTED_PATHS = {
  meta: "v1/meta.json",
  registry: "v1/registry.json",
  trendingView: "v1/views/trending.json",
  upAndComingView: "v1/views/up-and-coming.json",
  breakoutsView: "v1/views/breakouts.json",
  genresView: "v1/views/genres.json",
  saturationView: "v1/views/saturation.json",
  risingNichesView: "v1/views/rising-niches.json",
  genreRevenueView: "v1/views/genre-revenue.json",
  steamBreakoutsView: "v1/views/steam-breakouts.json",
  steamState: "v1/external/steam/state.json",
  steamCatalog: "v1/external/steam/catalog.json",
  raw: (date: string, runId: string) => `v1/raw/${date}/${runId}.json.gz`,
  gamepasses: (date: string) => `v1/gamepasses/${date}.json.gz`,
  hourly: (date: string) => `v1/hourly/${date}.json.gz`,
  daily: (date: string) => `v1/daily/${date}.json.gz`,
  historyShard: (shard: number) => `v1/history/${shard}.json.gz`,
} as const;

/** Shard index for a universe id. */
export function shardOf(universeId: number): number {
  return universeId % HISTORY_SHARD_COUNT;
}
