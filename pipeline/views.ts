/**
 * Hot-view computation: the pre-ranked JSON files agents actually read.
 *
 * Pure: takes the registry, the recent hourly rollups (~8 days), and the
 * just-written raw run, returns the four view files. Growth/anomaly math
 * comes from `src/core/growth.ts` — the same implementation the local
 * rankings module uses, so hosted and local semantics never drift.
 */

import { type GrowthPoint, windowGrowthPct, zScoreOfLatest } from "../src/core/growth.js";
import {
  type GenreAggregate,
  type GenresView,
  HOSTED_SCHEMA_VERSION,
  type HourlyFile,
  type RankedView,
  type RawRunFile,
  type RegistryFile,
  type ViewEntry,
} from "../src/shared/hosted-format.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Growth values are capped here so zero-baseline launches stay finite. */
const GROWTH_CAP = 1000;
const TRENDING_MIN_PLAYING = 100;
const TRENDING_LIMIT = 1000;
const UP_AND_COMING_MIN_PLAYING = 50;
const UP_AND_COMING_MAX_BASELINE = 5000;
const UP_AND_COMING_LIMIT = 500;
const BREAKOUT_MIN_Z = 2;
const BREAKOUT_LIMIT = 500;
const GENRE_TOP_GAMES = 5;
const Z_LOOKBACK_DAYS = 8;

export interface ComputeViewsInput {
  registry: RegistryFile;
  /** Hourly rollups for the recent window (typically the last 8 UTC days). */
  hourlyFiles: ReadonlyArray<HourlyFile>;
  /** The raw run just captured — its rows are the live values. */
  run: RawRunFile;
  /** Epoch ms "now"; injected for testability. */
  now: number;
}

export interface ComputedViews {
  trending: RankedView;
  upAndComing: RankedView;
  breakouts: RankedView;
  genres: GenresView;
}

interface GameSeries {
  /** avg-playing points (hourly rollups + the live observation), ascending. */
  points: GrowthPoint[];
  /** hourly peak values within the last 24h. */
  peaks24h: number[];
  /** oldest in-window visits observation within the last 24h. */
  oldestVisits24h: number | null;
}

export function computeViews(input: ComputeViewsInput): ComputedViews {
  const { registry, hourlyFiles, run, now } = input;
  const generatedAt = new Date(now).toISOString();
  const runT = Date.parse(run.takenAt);

  // Per-game hourly series, ascending by time.
  const series = new Map<number, GameSeries>();
  const seriesFor = (id: number): GameSeries => {
    let s = series.get(id);
    if (s === undefined) {
      s = { points: [], peaks24h: [], oldestVisits24h: null };
      series.set(id, s);
    }
    return s;
  };

  const sortedHourly = [...hourlyFiles].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const file of sortedHourly) {
    const dayStart = Date.parse(`${file.date}T00:00:00.000Z`);
    for (const [key, rows] of Object.entries(file.games)) {
      const s = seriesFor(Number(key));
      for (const [hour, avg, peak, visits] of rows) {
        const t = dayStart + hour * HOUR_MS;
        s.points.push({ t, value: avg });
        if (t >= now - DAY_MS) {
          s.peaks24h.push(peak);
          if (s.oldestVisits24h === null) s.oldestVisits24h = visits;
        }
      }
    }
  }

  const entries: ViewEntry[] = [];
  const baselines = new Map<number, number>();
  for (const [universeId, playing, visits] of run.games) {
    const reg = registry.games[String(universeId)];
    const s = seriesFor(universeId);
    const points = [...s.points, { t: runT, value: playing }];

    const points24h = points.filter((p) => p.t >= now - DAY_MS);
    const avg24h =
      points24h.length > 0
        ? points24h.reduce((sum, p) => sum + p.value, 0) / points24h.length
        : null;
    const peak24h = points24h.length > 0 ? Math.max(playing, ...s.peaks24h) : null;
    const oldest24h = points24h.length > 0 ? (points24h[0] as GrowthPoint).value : null;
    if (oldest24h !== null) baselines.set(universeId, oldest24h);

    entries.push({
      universeId,
      name: reg?.name ?? null,
      genre: reg?.genre ?? null,
      playing,
      avg24h,
      peak24h,
      growth24hPct: capGrowth(windowGrowthPct(points, DAY_MS, now)),
      growth7dPct: capGrowth(windowGrowthPct(points, 7 * DAY_MS, now)),
      zScore24h: zScore24h(points, now),
      visitsDelta24h: s.oldestVisits24h !== null ? visits - s.oldestVisits24h : null,
    });
  }

  const trending: ViewEntry[] = entries
    .filter((e) => e.playing >= TRENDING_MIN_PLAYING && e.growth24hPct !== null)
    .sort((a, b) => trendingScore(b) - trendingScore(a))
    .slice(0, TRENDING_LIMIT);

  const upAndComing: ViewEntry[] = entries
    .filter((e) => {
      if (e.playing < UP_AND_COMING_MIN_PLAYING || e.growth24hPct === null) return false;
      const baseline = baselines.get(e.universeId);
      return baseline !== undefined && baseline < UP_AND_COMING_MAX_BASELINE;
    })
    .sort((a, b) => (b.growth24hPct ?? 0) - (a.growth24hPct ?? 0))
    .slice(0, UP_AND_COMING_LIMIT);

  const breakouts: ViewEntry[] = entries
    .filter((e) => e.zScore24h !== null && e.zScore24h >= BREAKOUT_MIN_Z)
    .sort((a, b) => (b.zScore24h ?? 0) - (a.zScore24h ?? 0))
    .slice(0, BREAKOUT_LIMIT);

  return {
    trending: rankedView(generatedAt, trending),
    upAndComing: rankedView(generatedAt, upAndComing),
    breakouts: rankedView(generatedAt, breakouts),
    genres: genresView(generatedAt, entries, series, run, now),
  };
}

/**
 * Trending favours fast growers, weighted by audience size so a 100→200 CCU
 * blip doesn't outrank a 50k→90k surge. Raw fields ship in every entry, so
 * clients can re-rank with their own weights.
 */
function trendingScore(e: ViewEntry): number {
  return (e.growth24hPct ?? 0) * Math.log10(e.playing + 10);
}

function capGrowth(growth: number | null): number | null {
  if (growth === null) return null;
  if (!Number.isFinite(growth)) return GROWTH_CAP;
  return Math.min(GROWTH_CAP, growth);
}

/**
 * Anomaly score: bucket the series into trailing UTC-aligned 24h windows
 * (oldest → newest, the newest being the trailing 24h) and z-score the
 * latest bucket against the prior ones.
 */
function zScore24h(points: ReadonlyArray<GrowthPoint>, now: number): number | null {
  const bucketAvgs: number[] = [];
  for (let k = Z_LOOKBACK_DAYS - 1; k >= 0; k--) {
    const start = now - (k + 1) * DAY_MS;
    const end = now - k * DAY_MS;
    let sum = 0;
    let count = 0;
    for (const p of points) {
      if (p.t > start && p.t <= end) {
        sum += p.value;
        count += 1;
      }
    }
    if (count > 0) bucketAvgs.push(sum / count);
  }
  return zScoreOfLatest(bucketAvgs);
}

function rankedView(generatedAt: string, entries: ViewEntry[]): RankedView {
  return { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt, entries };
}

function genresView(
  generatedAt: string,
  entries: ReadonlyArray<ViewEntry>,
  series: Map<number, GameSeries>,
  run: RawRunFile,
  now: number,
): GenresView {
  const runT = Date.parse(run.takenAt);
  interface GenreAcc {
    members: ViewEntry[];
    /** summed avg-playing per timestamp across member games. */
    summed: Map<number, number>;
  }
  const byGenre = new Map<string, GenreAcc>();
  for (const entry of entries) {
    if (entry.genre === null) continue;
    let acc = byGenre.get(entry.genre);
    if (acc === undefined) {
      acc = { members: [], summed: new Map() };
      byGenre.set(entry.genre, acc);
    }
    acc.members.push(entry);
    const s = series.get(entry.universeId);
    const points = [...(s?.points ?? []), { t: runT, value: entry.playing }];
    for (const p of points) {
      acc.summed.set(p.t, (acc.summed.get(p.t) ?? 0) + p.value);
    }
  }

  const genres: GenreAggregate[] = [];
  for (const [genre, acc] of byGenre) {
    const summedPoints: GrowthPoint[] = [...acc.summed.entries()]
      .map(([t, value]) => ({ t, value }))
      .sort((a, b) => a.t - b.t);
    const top = [...acc.members].sort((a, b) => b.playing - a.playing).slice(0, GENRE_TOP_GAMES);
    genres.push({
      genre,
      gameCount: acc.members.length,
      totalPlaying: acc.members.reduce((sum, e) => sum + e.playing, 0),
      growth24hPct: capGrowth(windowGrowthPct(summedPoints, DAY_MS, now)),
      growth7dPct: capGrowth(windowGrowthPct(summedPoints, 7 * DAY_MS, now)),
      topGames: top.map((e) => ({ universeId: e.universeId, name: e.name, playing: e.playing })),
    });
  }
  genres.sort((a, b) => b.totalPlaying - a.totalPlaying);
  return { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt, genres };
}
