/**
 * Per-genre monetization overrides for the genre-revenue estimate view.
 *
 * The base revenue heuristic (`estimateGameRevenue`) assumes a single
 * platform-wide conversion rate and average spend. Different genres monetize
 * very differently (a simulator with gamepasses vs. a social hangout), so this
 * table lets the pipeline nudge those two knobs per genre. Anything not listed
 * — or listed with `undefined` fields — falls back to the calculator defaults,
 * so the table is purely additive and safe to leave empty.
 *
 * Keys match the L1 genre strings stored in the registry. Values are
 * deliberately conservative; the estimate is still labeled low-confidence.
 */

export interface GenreMonetizationOverride {
  /** Fraction of CCU converting to a paying user per active day, in [0, 1]. */
  conversionRate?: number;
  /** Average Robux spent per paying user per active day. */
  averageRobuxPerPayingUser?: number;
}

/**
 * Override table. Empty by default: every genre uses the calculator defaults
 * until a genre is added here with evidence. Add entries as data justifies.
 */
export const GENRE_MONETIZATION: Readonly<Record<string, GenreMonetizationOverride>> = {};

/**
 * Look up the override for a genre. Returns `null` when no genre is given or
 * no override exists (so callers can fall through to calculator defaults and
 * report `assumptionsOverridden: false`).
 */
export function genreMonetizationOverride(genre: string | null): GenreMonetizationOverride | null {
  if (genre === null) return null;
  return GENRE_MONETIZATION[genre] ?? null;
}
