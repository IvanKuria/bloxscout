/**
 * Pure market-concentration math over a set of nonnegative magnitudes
 * (typically per-game playing counts within a genre).
 *
 * No IO, no state — callers pass plain arrays. Shared by the hosted-data
 * ingestion pipeline's saturation / rising-niches views (`pipeline/views.ts`)
 * so concentration semantics live in one tested place. Negative inputs are
 * treated as 0 (a game cannot hold negative audience share).
 */

/** Sum of `values`, flooring each element at 0. */
function positiveSum(values: ReadonlyArray<number>): number {
  let total = 0;
  for (const v of values) total += Math.max(v, 0);
  return total;
}

/**
 * Herfindahl-Hirschman Index over shares: `Σ (vᵢ / Σv)²`, in `[0, 1]`.
 *
 * - `0` when there is nothing to share (empty input or zero total).
 * - `1` when a single participant holds the entire total.
 * - `1/n` for `n` equal participants — the even-distribution floor.
 *
 * Higher means more concentrated (one game owns the players).
 */
export function herfindahlIndex(values: ReadonlyArray<number>): number {
  const total = positiveSum(values);
  if (total <= 0) return 0;
  let hhi = 0;
  for (const v of values) {
    const share = Math.max(v, 0) / total;
    hhi += share * share;
  }
  return hhi;
}

/**
 * Share of the total held by the `n` largest values, in `[0, 1]`.
 *
 * Returns `0` for empty input, a zero total, or `n <= 0`; returns `1` when
 * `n >= values.length`. Negative inputs are floored at 0.
 */
export function topNShare(values: ReadonlyArray<number>, n: number): number {
  if (n <= 0) return 0;
  const total = positiveSum(values);
  if (total <= 0) return 0;
  const topSum = [...values]
    .map((v) => Math.max(v, 0))
    .sort((a, b) => b - a)
    .slice(0, n)
    .reduce((sum, v) => sum + v, 0);
  return topSum / total;
}

/**
 * Standard logistic squash to `(0, 1)`:
 *   `1 / (1 + e^(-steepness * (x - midpoint)))`.
 *
 * Returns `0.5` at `x === midpoint`, rises monotonically in `x`, and
 * saturates towards 0/1 as `x` moves away from the midpoint. `steepness`
 * controls how sharply it transitions.
 */
export function logistic(x: number, midpoint: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
}
