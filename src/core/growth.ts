/**
 * Pure growth / anomaly math over time-series points.
 *
 * Shared by the local rankings module (`./rankings.ts`) and the hosted-data
 * ingestion pipeline (`pipeline/`), so both sides compute trending and
 * breakout semantics from one tested implementation. Nothing here touches
 * a store or the network — callers pass plain arrays.
 */

/** One observation: epoch-milliseconds timestamp + metric value. */
export interface GrowthPoint {
  t: number;
  value: number;
}

export interface ZScoreOptions {
  /**
   * Symmetric bound applied to the result so it stays finite (and therefore
   * JSON-serializable) even when the baseline has zero variance. Default 10.
   */
  clamp?: number;
}

const DEFAULT_Z_CLAMP = 10;
const MIN_Z_VALUES = 4;

/**
 * Relative growth from `baseline` to `current`.
 * `Infinity` when baseline is 0 and current is positive; `0` when both are 0.
 */
export function growthRate(baseline: number, current: number): number {
  if (baseline === 0) {
    return current === 0 ? 0 : Number.POSITIVE_INFINITY;
  }
  return (current - baseline) / baseline;
}

/**
 * Growth rate from the oldest to the newest point inside `[now - windowMs, now]`.
 * Returns `null` when fewer than 2 points fall inside the window. Input order
 * does not matter.
 */
export function windowGrowthPct(
  points: ReadonlyArray<GrowthPoint>,
  windowMs: number,
  now: number,
): number | null {
  const cutoff = now - windowMs;
  let oldest: GrowthPoint | undefined;
  let newest: GrowthPoint | undefined;
  let count = 0;
  for (const p of points) {
    if (p.t < cutoff) continue;
    count += 1;
    if (oldest === undefined || p.t < oldest.t) oldest = p;
    if (newest === undefined || p.t > newest.t) newest = p;
  }
  if (count < 2 || oldest === undefined || newest === undefined) return null;
  return growthRate(oldest.value, newest.value);
}

/**
 * Z-score of the last value against the mean/std of all preceding values
 * (population std). Clamped to ±`clamp` so a zero-variance baseline yields
 * a bounded "maximally anomalous" score instead of ±Infinity. Returns `null`
 * with fewer than 4 values — too little history to call anything a spike.
 */
export function zScoreOfLatest(
  values: ReadonlyArray<number>,
  opts: ZScoreOptions = {},
): number | null {
  if (values.length < MIN_Z_VALUES) return null;
  const clamp = opts.clamp ?? DEFAULT_Z_CLAMP;
  const latest = values[values.length - 1] as number;
  const prior = values.slice(0, -1);
  const mean = prior.reduce((sum, v) => sum + v, 0) / prior.length;
  const variance = prior.reduce((sum, v) => sum + (v - mean) ** 2, 0) / prior.length;
  const std = Math.sqrt(variance);
  if (std === 0) {
    if (latest === mean) return 0;
    return latest > mean ? clamp : -clamp;
  }
  const z = (latest - mean) / std;
  return Math.min(clamp, Math.max(-clamp, z));
}
