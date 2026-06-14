/**
 * Hot-view computation: the pre-ranked JSON files agents actually read.
 *
 * Pure: takes the registry, the recent hourly rollups (~8 days), and the
 * just-written raw run, returns the four view files. Growth/anomaly math
 * comes from `src/core/growth.ts` — the same implementation the local
 * rankings module uses, so hosted and local semantics never drift.
 */

import {
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  REVENUE_ESTIMATE_DISCLAIMER,
  estimateGameRevenue,
} from "@bloxscout/core/calculators";
import { herfindahlIndex, logistic, topNShare } from "@bloxscout/core/concentration";
import { genreMonetizationOverride } from "@bloxscout/core/genre-monetization";
import { type GrowthPoint, windowGrowthPct, zScoreOfLatest } from "@bloxscout/core/growth";
import {
  type GenreAggregate,
  type GenreRevenueView,
  type GenresView,
  HOSTED_SCHEMA_VERSION,
  type HourlyFile,
  type RankedView,
  type RawRunFile,
  type RegistryFile,
  type RisingNicheEntry,
  type RisingNichesView,
  type SaturationEntry,
  type SaturationView,
  type ViewEntry,
} from "@bloxscout/core/hosted-format";

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

// --- Saturation view tuning -------------------------------------------------
/** A genre needs at least this many games to be scored at all. */
const MIN_GAMES_FOR_SATURATION = 5;
/** Top games examined for the incumbency signal. */
const INCUMBENCY_TOP_N = 10;
/** A game added within this many days counts as a "fresh entrant". */
const ENTRANT_WINDOW_DAYS = 30;
/** Below this saturation score (and with enough games) a genre is white space. */
const WHITE_SPACE_THRESHOLD = 40;
const W_HHI = 0.4;
const W_TOP1 = 0.25;
const W_INCUMBENCY = 0.35;
const W_HEADROOM = 0.3;

// --- Rising-niches view tuning ----------------------------------------------
/** Genre-level z-score above which a "rise" is treated as an event-driven flash. */
const SPIKE_Z = 3.5;

// --- Genre-revenue view tuning ----------------------------------------------
/** Top earners summed into the headline figure. */
const REVENUE_TOP_N = 5;
const REVENUE_DAYS_ACTIVE = 30;

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
  saturation: SaturationView;
  risingNiches: RisingNichesView;
  genreRevenue: GenreRevenueView;
}

/**
 * Per-genre accumulator built once in `computeViews` and shared by the
 * genres / saturation / rising-niches / genre-revenue views.
 */
interface GenreAcc {
  members: ViewEntry[];
  /** Summed avg-playing per timestamp across member games (ascending later). */
  summed: Map<number, number>;
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

  // Build the per-genre accumulator ONCE; every genre-derived view reads it.
  const byGenre = buildGenreAcc(entries, series, runT);

  const genres = genresView(generatedAt, byGenre, now);
  const saturation = saturationView(generatedAt, byGenre, registry, now);
  const genreRevenue = genreRevenueView(generatedAt, byGenre);
  // Rising niches consumes the genre aggregates + saturation scores.
  const risingNiches = risingNichesView(
    generatedAt,
    genres.genres,
    saturation.entries,
    byGenre,
    now,
  );

  return {
    trending: rankedView(generatedAt, trending),
    upAndComing: rankedView(generatedAt, upAndComing),
    breakouts: rankedView(generatedAt, breakouts),
    genres,
    saturation,
    risingNiches,
    genreRevenue,
  };
}

/** Assemble the shared per-genre accumulator from the flat entries. */
function buildGenreAcc(
  entries: ReadonlyArray<ViewEntry>,
  series: Map<number, GameSeries>,
  runT: number,
): Map<string, GenreAcc> {
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
  return byGenre;
}

/** Summed avg-playing series for a genre, ascending by time. */
function summedSeries(acc: GenreAcc): GrowthPoint[] {
  return [...acc.summed.entries()].map(([t, value]) => ({ t, value })).sort((a, b) => a.t - b.t);
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

function genresView(generatedAt: string, byGenre: Map<string, GenreAcc>, now: number): GenresView {
  const genres: GenreAggregate[] = [];
  for (const [genre, acc] of byGenre) {
    const summedPoints = summedSeries(acc);
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

// ---------------------------------------------------------------------------
// View 1 — Saturation / gap index per genre
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function median(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number);
}

function saturationView(
  generatedAt: string,
  byGenre: Map<string, GenreAcc>,
  registry: RegistryFile,
  now: number,
): SaturationView {
  const entrantCutoff = now - ENTRANT_WINDOW_DAYS * DAY_MS;

  // Cross-genre median intensity (players per game), over scorable genres only.
  const intensities: number[] = [];
  for (const acc of byGenre.values()) {
    if (acc.members.length < MIN_GAMES_FOR_SATURATION) continue;
    const totalPlaying = acc.members.reduce((sum, e) => sum + Math.max(e.playing, 0), 0);
    intensities.push(totalPlaying / acc.members.length);
  }
  const medianIntensity = median(intensities);

  const entries: SaturationEntry[] = [];
  for (const [genre, acc] of byGenre) {
    const gameCount = acc.members.length;
    const totalPlaying = acc.members.reduce((sum, e) => sum + e.playing, 0);
    const playings = acc.members.map((e) => Math.max(e.playing, 0));

    if (gameCount < MIN_GAMES_FOR_SATURATION) {
      entries.push({
        genre,
        gameCount,
        totalPlaying,
        saturationScore: null,
        whiteSpace: false,
        components: {
          hhi: 0,
          top1Share: 0,
          top3Share: 0,
          incumbencyScore: null,
          intensityScore: 0,
          playersPerGame: gameCount > 0 ? totalPlaying / gameCount : 0,
        },
        reason: "insufficient_games",
      });
      continue;
    }

    const hhi = herfindahlIndex(playings);
    const top1Share = topNShare(playings, 1);
    const top3Share = topNShare(playings, 3);
    const playersPerGame = totalPlaying / gameCount;
    const intensity = medianIntensity > 0 ? logistic(playersPerGame / medianIntensity, 1, 2) : 0.5;

    // Incumbency (Signal C) — only meaningful once addedAt history has accrued.
    const topByPlaying = [...acc.members]
      .sort((a, b) => b.playing - a.playing)
      .slice(0, INCUMBENCY_TOP_N);
    const oldestAddedAt = Math.min(
      ...acc.members.map((e) => {
        const reg = registry.games[String(e.universeId)];
        return reg ? Date.parse(reg.addedAt) : now;
      }),
    );
    // Reliable only if at least one member was added before the entrant window
    // opened (otherwise every game looks "fresh" and the signal is noise).
    const addedAtReliable = oldestAddedAt < entrantCutoff;
    let incumbencyScore: number | null = null;
    if (addedAtReliable) {
      const denom = Math.min(INCUMBENCY_TOP_N, gameCount);
      const freshCount = topByPlaying.filter((e) => {
        const reg = registry.games[String(e.universeId)];
        return reg !== undefined && Date.parse(reg.addedAt) >= entrantCutoff;
      }).length;
      const freshTopShare = denom > 0 ? freshCount / denom : 0;
      incumbencyScore = 1 - freshTopShare;
    }

    // Weighted raw score; drop & renormalize incumbency when unreliable.
    const wIncumbency = incumbencyScore === null ? 0 : W_INCUMBENCY;
    const positiveWeight = W_HHI + W_TOP1 + wIncumbency;
    const incumbencyTerm = incumbencyScore === null ? 0 : W_INCUMBENCY * incumbencyScore;
    const saturationRaw =
      positiveWeight > 0
        ? (W_HHI * hhi + W_TOP1 * top1Share + incumbencyTerm) / positiveWeight -
          W_HEADROOM * intensity
        : -W_HEADROOM * intensity;
    const saturationScore = Math.round(100 * clamp01(saturationRaw));
    const whiteSpace =
      saturationScore < WHITE_SPACE_THRESHOLD && gameCount >= MIN_GAMES_FOR_SATURATION;

    entries.push({
      genre,
      gameCount,
      totalPlaying,
      saturationScore,
      whiteSpace,
      components: {
        hhi,
        top1Share,
        top3Share,
        incumbencyScore,
        intensityScore: intensity,
        playersPerGame,
      },
      reason: null,
    });
  }

  // Sort by score desc, nulls last.
  entries.sort((a, b) => {
    if (a.saturationScore === null) return b.saturationScore === null ? 0 : 1;
    if (b.saturationScore === null) return -1;
    return b.saturationScore - a.saturationScore;
  });
  return { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt, entries };
}

// ---------------------------------------------------------------------------
// View 3 — Per-genre revenue-estimate aggregate
// ---------------------------------------------------------------------------

function genreRevenueView(generatedAt: string, byGenre: Map<string, GenreAcc>): GenreRevenueView {
  const entries: GenreRevenueView["entries"] = [];
  for (const [genre, acc] of byGenre) {
    const override = genreMonetizationOverride(genre);
    const opts = {
      daysActive: REVENUE_DAYS_ACTIVE,
      ...(override?.conversionRate !== undefined
        ? { conversionRate: override.conversionRate }
        : {}),
      ...(override?.averageRobuxPerPayingUser !== undefined
        ? { averageRobuxPerPayingUser: override.averageRobuxPerPayingUser }
        : {}),
    };
    const perGame = acc.members.map((m) => ({
      playing: m.playing,
      usd: estimateGameRevenue({ playing: Math.max(m.playing, 0), visits: 0 }, opts)
        .estimatedMonthlyUsd,
    }));
    const totalPlaying = acc.members.reduce((sum, e) => sum + e.playing, 0);
    const estTotalMonthlyUsd = round2(perGame.reduce((sum, g) => sum + g.usd, 0));
    const estMedianGameMonthlyUsd = round2(median(perGame.map((g) => g.usd)));
    const estTopNMonthlyUsd = round2(
      [...perGame]
        .sort((a, b) => b.playing - a.playing)
        .slice(0, REVENUE_TOP_N)
        .reduce((sum, g) => sum + g.usd, 0),
    );
    const revenuePerThousandCcuUsd =
      totalPlaying > 0 ? round2(estTotalMonthlyUsd / (totalPlaying / 1000)) : 0;
    entries.push({
      genre,
      gameCount: acc.members.length,
      totalPlaying,
      estTotalMonthlyUsd,
      estMedianGameMonthlyUsd,
      estTopNMonthlyUsd,
      revenuePerThousandCcuUsd,
      assumptionsOverridden: override !== null,
    });
  }
  entries.sort((a, b) => b.estTotalMonthlyUsd - a.estTotalMonthlyUsd);

  // Surface the baseline assumptions (the calculator defaults the estimate uses).
  const baseline = estimateGameRevenue(
    { playing: 0, visits: 0 },
    { daysActive: REVENUE_DAYS_ACTIVE },
  );
  return {
    schemaVersion: HOSTED_SCHEMA_VERSION,
    generatedAt,
    confidence: "low",
    assumptions: {
      conversionRate: baseline.inputs.conversionRate,
      averageRobuxPerPayingUser: baseline.inputs.averageRobuxPerPayingUser,
      daysActive: REVENUE_DAYS_ACTIVE,
      rateUsdPerRobux: DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
    },
    disclaimer: REVENUE_ESTIMATE_DISCLAIMER,
    entries,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// View 2 — Rising niches (computed AFTER saturation + genres)
// ---------------------------------------------------------------------------

function risingNichesView(
  generatedAt: string,
  genreAggregates: ReadonlyArray<GenreAggregate>,
  saturationEntries: ReadonlyArray<SaturationEntry>,
  byGenre: Map<string, GenreAcc>,
  now: number,
): RisingNichesView {
  const satByGenre = new Map(saturationEntries.map((e) => [e.genre, e]));
  const entries: RisingNicheEntry[] = [];

  for (const agg of genreAggregates) {
    const sat = satByGenre.get(agg.genre);
    const acc = byGenre.get(agg.genre);
    const top1Share =
      sat?.components.top1Share ??
      (acc
        ? topNShare(
            acc.members.map((m) => Math.max(m.playing, 0)),
            1,
          )
        : 0);

    const has7d = agg.growth7dPct !== null;
    const growthSignal = agg.growth7dPct ?? agg.growth24hPct ?? 0;
    const momentum = clamp01(logistic(growthSignal, 0.15, 8));

    const saturationScore = sat?.saturationScore ?? null;
    const opportunity = saturationScore === null ? 1 : 1 - saturationScore / 100;

    const { durability, genreZScore } = durabilityScore(agg, top1Share, acc, now);
    const risingScore = Math.round(100 * momentum * opportunity * durability);

    const top = acc
      ? [...acc.members]
          .sort((a, b) => b.playing - a.playing)
          .slice(0, GENRE_TOP_GAMES)
          .map((e) => ({ universeId: e.universeId, name: e.name, playing: e.playing }))
      : agg.topGames;

    entries.push({
      genre: agg.genre,
      risingScore,
      growth24hPct: agg.growth24hPct,
      growth7dPct: agg.growth7dPct,
      saturationScore,
      components: { momentum, opportunity, durability, genreZScore, top1Share },
      durabilityBasis: has7d ? "7d" : "24h-only",
      topGames: top,
    });
  }

  entries.sort((a, b) => b.risingScore - a.risingScore);
  return { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt, entries };
}

/**
 * Durability: starts at 1.0 and multiplies penalties for fragile "rises".
 * 1. Window disagreement (up 24h but down 7d) → ×0.3.
 * 2. Single event-driven spike (genre z-score > SPIKE_Z) → ×0.5.
 * 3. One game owns the niche (top1Share > 0.6) → ×0.5.
 */
function durabilityScore(
  agg: GenreAggregate,
  top1Share: number,
  acc: GenreAcc | undefined,
  now: number,
): { durability: number; genreZScore: number | null } {
  let durability = 1;

  // 1. Both-window agreement (only when 7d is available).
  if (
    agg.growth7dPct !== null &&
    agg.growth24hPct !== null &&
    agg.growth24hPct > 0 &&
    agg.growth7dPct <= 0
  ) {
    durability *= 0.3;
  }

  // 2. Single spike via genre-level z-score on trailing-24h buckets.
  const genreZScore = acc ? genreZScore24h(summedSeries(acc), now) : null;
  if (genreZScore !== null && genreZScore > SPIKE_Z) {
    durability *= 0.5;
  }

  // 3. Breadth: one game owns the niche.
  if (top1Share > 0.6) {
    durability *= 0.5;
  }

  return { durability: clamp01(durability), genreZScore };
}

/** Genre-level analogue of `zScore24h`: z-score the latest trailing-24h bucket. */
function genreZScore24h(points: ReadonlyArray<GrowthPoint>, now: number): number | null {
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
