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

/** `[universeId, playing, visits, favoritedCount]` */
export const RawRunRowSchema = z.tuple([
  z.number().int(),
  z.number().int(),
  z.number().int(),
  z.number().int(),
]);
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
  raw: (date: string, runId: string) => `v1/raw/${date}/${runId}.json.gz`,
  hourly: (date: string) => `v1/hourly/${date}.json.gz`,
  daily: (date: string) => `v1/daily/${date}.json.gz`,
  historyShard: (shard: number) => `v1/history/${shard}.json.gz`,
} as const;

/** Shard index for a universe id. */
export function shardOf(universeId: number): number {
  return universeId % HISTORY_SHARD_COUNT;
}
