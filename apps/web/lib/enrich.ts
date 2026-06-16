/**
 * Per-game enrichment — the faithful "what do we actually know about this game"
 * layer for the copilot. The live search/recommendation rows the tools start
 * with are thin (a CCU here, a vote total there); the rich signals that let the
 * MODEL reason instead of guess live in the hosted dataset: per-game time-series
 * history (growth over real windows + a CCU sparkline) and the registry (game
 * age, dev ship cadence). This module joins those to a universe id and returns
 * one compact, JSON-serializable bundle.
 *
 * Faithful means: every field is either a real measured figure or `null`. When
 * history is too thin to compute a window growth, we return `null` and a
 * `historyNote` saying so, never a fabricated number. The model is expected to
 * weight confidence itself (e.g. a 90% like-ratio on 50 votes is not a 90% on
 * 50k), so we always surface the RAW counts beside any derived ratio.
 *
 * SERVER-ONLY: reads the hosted dataset via `lib/data.ts`.
 */
import "server-only";
import { windowGrowthPct } from "@bloxscout/core/growth";
import { getGameHistory, getRegistryEntry } from "@/lib/data";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
/** Cap the CCU sparkline so a deep history doesn't blow the token budget. */
const MAX_SERIES_POINTS = 14;

/** One point in the compact CCU context series. */
export interface CcuPoint {
  /** Epoch milliseconds. */
  t: number;
  /** Average concurrent players over the bucket. */
  avg: number;
}

/**
 * The faithful signal bundle for one game. Every derived figure is `null` when
 * the underlying data is too thin to compute it honestly.
 */
export interface GameEnrichment {
  universeId: number;
  /** Relative CCU growth over each window, as a fraction (0.6 = +60%). `null` = not enough history. */
  growth24hPct: number | null;
  growth7dPct: number | null;
  growth30dPct: number | null;
  /** Recent daily-average CCU, oldest -> newest, capped to ~14 points. May be empty. */
  ccuSeries: CcuPoint[];
  /** Game age in days, from the registry `createdAt`. `null` when unknown. */
  ageDays: number | null;
  /** Game's own `created` ISO timestamp, when known. */
  createdAt: string | null;
  /** How many distinct dev updates we've observed (ship cadence proxy). `null` when untracked. */
  updateCount: number | null;
  /** Last observed `updated` timestamp. `null` when untracked. */
  lastUpdatedAt: string | null;
  /** Latest absolute visits, from the newest history point. `null` when unknown. */
  visits: number | null;
  /** Latest favorited count, from the newest history point. `null` when unknown. */
  favorites: number | null;
  /** favorites / visits, a rough engagement proxy. `null` when either is missing. */
  favoritesPerVisit: number | null;
  /** True when no usable history exists for this game (sparkline + growth are empty/null). */
  thinHistory: boolean;
  /** Honest one-liner when history is thin, else undefined. */
  historyNote?: string;
}

function ageDaysFrom(createdAt: string | null | undefined, now: number): number | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((now - t) / DAY_MS));
}

/**
 * Build the enrichment bundle for one game. Never throws — degrades to `null`
 * fields + a `historyNote` when the hosted dataset has nothing for this id.
 */
export async function enrichGame(
  universeId: number,
  now: number = Date.now(),
): Promise<GameEnrichment> {
  const [history, reg] = await Promise.all([
    getGameHistory(universeId),
    getRegistryEntry(universeId),
  ]);

  // History points: [epochMs, avgPlaying, peakPlaying, visits, favoritedCount]
  const hourly = (history?.hourly ?? [])
    .map((p) => ({ t: p[0], avg: p[1], visits: p[3], fav: p[4] }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  // Daily points: [date, avgPlaying, peakPlaying, visitsDelta, favoritedCount]
  const daily = (history?.daily ?? [])
    .map((p) => ({ t: Date.parse(p[0]), avg: p[1] }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  // Growth windows run over the dense hourly series (where the windows fall);
  // 30d leans on hourly too since it spans the whole tracked range.
  const growthPoints = hourly.map((p) => ({ t: p.t, value: p.avg }));
  const growth24hPct = windowGrowthPct(growthPoints, DAY_MS, now);
  const growth7dPct = windowGrowthPct(growthPoints, WEEK_MS, now);
  const growth30dPct = windowGrowthPct(growthPoints, MONTH_MS, now);

  // CCU context: prefer the daily-avg series (one point per day reads cleanly);
  // fall back to a downsample of hourly when daily is empty. Cap to MAX points.
  let series: CcuPoint[];
  if (daily.length > 0) {
    series = daily.slice(-MAX_SERIES_POINTS).map((p) => ({ t: p.t, avg: p.avg }));
  } else if (hourly.length > 0) {
    const step = Math.max(1, Math.ceil(hourly.length / MAX_SERIES_POINTS));
    series = hourly
      .filter((_, i) => i % step === 0)
      .slice(-MAX_SERIES_POINTS)
      .map((p) => ({ t: p.t, avg: p.avg }));
  } else {
    series = [];
  }

  const latest = hourly.length > 0 ? hourly[hourly.length - 1] : null;
  const visits = latest?.visits ?? null;
  const favorites = latest?.fav ?? null;
  const favoritesPerVisit =
    visits !== null && favorites !== null && visits > 0 ? favorites / visits : null;

  const thinHistory = series.length === 0 && growth24hPct === null && growth7dPct === null;

  return {
    universeId,
    growth24hPct,
    growth7dPct,
    growth30dPct,
    ccuSeries: series,
    ageDays: ageDaysFrom(reg?.createdAt, now),
    createdAt: reg?.createdAt ?? null,
    updateCount: typeof reg?.updateCount === "number" ? reg.updateCount : null,
    lastUpdatedAt: reg?.lastUpdatedAt ?? null,
    visits,
    favorites,
    favoritesPerVisit,
    thinHistory,
    ...(thinHistory
      ? {
          historyNote:
            "No tracked history for this game yet, so growth windows and the CCU series are unavailable. Treat momentum as unknown, not flat.",
        }
      : {}),
  };
}

/**
 * Enrich many games at once, bounded to the first `cap` ids (token control for
 * list tools). Returns a Map keyed by universe id; ids beyond the cap are
 * simply absent so callers can leave those rows un-enriched.
 */
export async function enrichGames(
  universeIds: readonly number[],
  cap = 12,
  now: number = Date.now(),
): Promise<Map<number, GameEnrichment>> {
  const ids = universeIds.slice(0, Math.max(0, cap));
  const entries = await Promise.all(ids.map((id) => enrichGame(id, now)));
  return new Map(entries.map((e) => [e.universeId, e]));
}
