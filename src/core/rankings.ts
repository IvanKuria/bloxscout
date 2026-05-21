/**
 * Pure ranking functions over snapshot history.
 *
 * These are stateless: callers pass in a `SnapshotStore` (so test fixtures
 * can use an in-memory tempfile DB) and get back ranked arrays. The store is
 * the single source of truth; nothing here mutates it.
 */

import type { GameSnapshot, SnapshotStore } from "./snapshots.js";
import type { RobloxUniverseId } from "./types.js";

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 25;
const DEFAULT_UP_AND_COMING_BASELINE = 5000;

/** One entry in a trending / up-and-coming ranking. */
export interface TrendingEntry {
  universeId: RobloxUniverseId;
  name: string | null;
  currentPlaying: number;
  /**
   * Growth rate over the window: `(latest.playing - baseline.playing) / baseline.playing`.
   * `Infinity` when baseline is 0 and latest is positive; `0` when both are 0.
   */
  deltaPct: number;
  snapshotCount: number;
}

export interface ComputeTrendingOptions {
  /** Lower bound on snapshot time. Default: now - 24h. */
  since?: Date;
  /** Max rows returned. Default 25. */
  limit?: number;
}

export interface ComputeUpAndComingOptions extends ComputeTrendingOptions {
  /**
   * Maximum baseline playing count for a game to be considered
   * "up-and-coming". Default 5000.
   */
  minBaselinePlayers?: number;
}

export type GrowthWindow = "1h" | "24h" | "7d" | "30d";

export interface ComputeGrowthSeriesOptions {
  /** Window over which to bucket. Default `'24h'`. */
  window?: GrowthWindow;
}

/** One bucket in a charted growth series. */
export interface GrowthBucket {
  bucketStart: string;
  avgPlaying: number;
  maxPlaying: number;
}

/**
 * Rank tracked games by `playing`-count growth over a window.
 *
 * For each universe with at least 2 snapshots inside the window, computes
 * `(latest - oldest) / oldest`, ranks descending, and trims to `limit`.
 * Games with insufficient data are dropped silently.
 */
export function computeTrending(
  store: SnapshotStore,
  opts: ComputeTrendingOptions = {},
): TrendingEntry[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const since = opts.since ?? new Date(Date.now() - DEFAULT_WINDOW_MS);
  return rankByGrowth(store, since, limit);
}

/**
 * Same shape as `computeTrending`, but filtered to small-baseline games
 * (default <5,000 baseline players) showing high growth. This catches the
 * "early breakout" pattern that the headline trending list misses because
 * the top of `playing` is dominated by perennial juggernauts.
 */
export function computeUpAndComing(
  store: SnapshotStore,
  opts: ComputeUpAndComingOptions = {},
): TrendingEntry[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const since = opts.since ?? new Date(Date.now() - DEFAULT_WINDOW_MS);
  const ceiling = opts.minBaselinePlayers ?? DEFAULT_UP_AND_COMING_BASELINE;
  // Pull a fat list (we filter afterwards), then trim.
  const candidates = rankByGrowth(store, since, Number.POSITIVE_INFINITY);
  const filtered: TrendingEntry[] = [];
  for (const entry of candidates) {
    const baselineSnap = oldestInWindow(store, entry.universeId, since);
    if (baselineSnap === null) continue;
    if (baselineSnap.playing >= ceiling) continue;
    filtered.push(entry);
    if (filtered.length >= limit) break;
  }
  return filtered;
}

/**
 * Aggregate `universeId`'s snapshots into time buckets sized to the window.
 * Useful for charting; not for ranking.
 *
 * Bucket size is 1/60th of the window — for `'24h'` that's 24-minute buckets,
 * giving 60 points which renders cleanly. Each bucket reports avg + max.
 */
export function computeGrowthSeries(
  store: SnapshotStore,
  universeId: RobloxUniverseId,
  opts: ComputeGrowthSeriesOptions = {},
): GrowthBucket[] {
  const window = opts.window ?? "24h";
  const windowMs = windowToMs(window);
  const bucketMs = Math.max(60_000, Math.floor(windowMs / 60));
  const since = new Date(Date.now() - windowMs);
  const snapshots = store.getGameHistory(universeId, { since, limit: 100_000 });
  if (snapshots.length === 0) return [];

  // Group into buckets keyed by floor(takenAt / bucketMs).
  const buckets = new Map<number, { sum: number; count: number; max: number; start: number }>();
  for (const snap of snapshots) {
    const t = Date.parse(snap.takenAt);
    if (!Number.isFinite(t)) continue;
    const bucketIndex = Math.floor(t / bucketMs);
    const bucketStart = bucketIndex * bucketMs;
    const existing = buckets.get(bucketIndex);
    if (existing === undefined) {
      buckets.set(bucketIndex, {
        sum: snap.playing,
        count: 1,
        max: snap.playing,
        start: bucketStart,
      });
    } else {
      existing.sum += snap.playing;
      existing.count += 1;
      if (snap.playing > existing.max) existing.max = snap.playing;
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.start - b.start)
    .map((b) => ({
      bucketStart: new Date(b.start).toISOString(),
      avgPlaying: b.sum / b.count,
      maxPlaying: b.max,
    }));
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function rankByGrowth(store: SnapshotStore, since: Date, limit: number): TrendingEntry[] {
  const entries: TrendingEntry[] = [];
  for (const universeId of store.getTrackedUniverseIds()) {
    const history = store.getGameHistory(universeId, { since, limit: 100_000 });
    if (history.length < 2) continue;
    // history is DESC by takenAt: index 0 is latest, last index is oldest in window.
    const latest = history[0];
    const oldest = history[history.length - 1];
    if (latest === undefined || oldest === undefined) continue;
    const deltaPct = growthRate(oldest.playing, latest.playing);
    const meta = store.getMetadata(universeId);
    entries.push({
      universeId,
      name: meta?.name ?? null,
      currentPlaying: latest.playing,
      deltaPct,
      snapshotCount: history.length,
    });
  }
  entries.sort((a, b) => b.deltaPct - a.deltaPct);
  if (!Number.isFinite(limit)) return entries;
  return entries.slice(0, limit);
}

function oldestInWindow(
  store: SnapshotStore,
  universeId: RobloxUniverseId,
  since: Date,
): GameSnapshot | null {
  const history = store.getGameHistory(universeId, { since, limit: 100_000 });
  if (history.length === 0) return null;
  return history[history.length - 1] ?? null;
}

function growthRate(baseline: number, current: number): number {
  if (baseline === 0) {
    return current === 0 ? 0 : Number.POSITIVE_INFINITY;
  }
  return (current - baseline) / baseline;
}

function windowToMs(window: GrowthWindow): number {
  switch (window) {
    case "1h":
      return 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}
