import { BloxscoutError, RobloxNotFoundError } from "@bloxscout/core/errors";
import { SUPPORTED_GENRES, lookupGenre } from "@bloxscout/core/genre-seeds";
import { GameSchema } from "@bloxscout/core/schemas";
import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const MetricComparisonSchema = z.object({
  value: z.number(),
  genreMedian: z.number(),
  genreP75: z.number(),
  genreMax: z.number(),
  /** Percentile of the target game within the cohort, 0-100. */
  percentile: z.number().min(0).max(100),
});

export const AnalyzeGameVsGenreInputSchema = z.object({
  universeId: z.number().int().positive(),
  /**
   * Optional. If omitted, the target game's own `genre_l1` is used. Pass
   * this when you want to benchmark against a genre the game does not
   * officially belong to (e.g. an "All" game vs the Simulator cohort).
   */
  genre: z.string().min(1).optional(),
  /** Cohort size for the percentile / median calculations. Default 20, max 100. */
  cohortLimit: z.number().int().positive().max(100).default(20),
});

export const AnalyzeGameVsGenreOutputSchema = z.object({
  game: GameSchema,
  genre: z.string(),
  cohortSize: z.number().int().nonnegative(),
  metrics: z.object({
    playing: MetricComparisonSchema,
    visits: MetricComparisonSchema,
    favoritedCount: MetricComparisonSchema,
    maxPlayers: MetricComparisonSchema,
  }),
});

/**
 * Game-intelligence tool: benchmark one game against the cohort median +
 * 75th percentile + max of its genre.
 *
 * Composes `get_game` (for the target) with a cohort sourced from Roblox's
 * omni-search ranking for the genre keyword — the same source
 * `get_top_by_genre` uses. Pre-v0.1.0 this used a hand-curated universe-id
 * seed list that drifted into Studio templates with 0 CCU (#34).
 */
export const analyzeGameVsGenre: ToolDefinition<
  typeof AnalyzeGameVsGenreInputSchema,
  typeof AnalyzeGameVsGenreOutputSchema
> = {
  name: "analyze_game_vs_genre",
  description: [
    "Benchmark one Roblox game against the median, 75th percentile, and",
    "max of its genre cohort across four metrics: `playing` (live CCU),",
    "`visits` (lifetime), `favoritedCount`, and `maxPlayers` (server cap).",
    "Returns",
    "the full target `Game` plus per-metric `{ value, genreMedian,",
    "genreP75, genreMax, percentile }` so the agent can directly say",
    "things like 'your game's CCU is in the 65th percentile of the",
    "Simulator cohort, 1.4x the median and 22% of the leader'.",
    "",
    "By default the cohort is the game's own `genre_l1`. Pass an explicit",
    "`genre` to benchmark against a different one (supported slugs:",
    "simulator, role-playing, adventure, fighting, obby, social, horror,",
    "shooter, plus aliases like 'rpg' / 'fps').",
    "",
    "Cohort source: the live omni-search top results for the genre keyword,",
    "ranked by `playing`. Real growth-aware cohorts ship in v0.2 once the",
    "snapshot store lands.",
  ].join(" "),
  inputSchema: AnalyzeGameVsGenreInputSchema,
  outputSchema: AnalyzeGameVsGenreOutputSchema,
  handler: async (input, ctx) => {
    const [target] = await ctx.client.getGames([input.universeId]);
    if (target === undefined) {
      throw new RobloxNotFoundError(
        `analyze_game_vs_genre: universeId ${input.universeId} not found`,
        { endpoint: "GET /v1/games" },
      );
    }

    const requestedGenre = input.genre ?? target.genre_l1 ?? target.genre;
    const entry = lookupGenre(requestedGenre);
    if (entry === undefined) {
      throw new BloxscoutError(
        `analyze_game_vs_genre: no curated cohort for genre "${requestedGenre}". Supported: ${SUPPORTED_GENRES.join(
          ", ",
        )}.`,
        "VALIDATION_ERROR",
      );
    }

    // Cohort comes from omni-search (live ranking for the genre keyword)
    // so it tracks current top games rather than a stale hand-curated list.
    // We pull a wider pool than cohortLimit so that filtering the target
    // out and sorting by playing still leaves enough cohort members.
    const candidatePoolSize = Math.min(50, Math.max(input.cohortLimit * 3, 25));
    const summaries = await ctx.client.searchGames(entry.searchQuery, {
      limit: candidatePoolSize,
    });
    const cohortIds = summaries.map((s) => s.universeId).filter((id) => id !== input.universeId);
    const cohortGames = cohortIds.length > 0 ? await ctx.client.getGames(cohortIds) : [];
    // Rank by playing, trim to cohortLimit, but always include the target
    // in the metric distribution so its own percentile is computed against
    // the same set the cohort stats report.
    const cohortRanked = cohortGames.slice().sort((a, b) => b.playing - a.playing);
    const cohortTrimmed = cohortRanked.slice(0, input.cohortLimit);

    const metrics = {
      playing: compare(
        target.playing,
        cohortTrimmed.map((g) => g.playing),
      ),
      visits: compare(
        target.visits,
        cohortTrimmed.map((g) => g.visits),
      ),
      favoritedCount: compare(
        target.favoritedCount,
        cohortTrimmed.map((g) => g.favoritedCount),
      ),
      maxPlayers: compare(
        target.maxPlayers,
        cohortTrimmed.map((g) => g.maxPlayers),
      ),
    };
    // Note: vote counts (upvotes/downvotes) live on `GameSummary` from the
    // omni-search side, not on the `Game` record from `games.roblox.com/v1/games`,
    // so they are intentionally excluded from this v0.1 comparison. v0.2 will
    // join the search-side payload onto the cohort.

    return {
      game: target,
      genre: entry.label,
      cohortSize: cohortTrimmed.length,
      metrics,
    };
  },
};

function compare(
  value: number,
  cohort: number[],
): {
  value: number;
  genreMedian: number;
  genreP75: number;
  genreMax: number;
  percentile: number;
} {
  if (cohort.length === 0) {
    return { value, genreMedian: 0, genreP75: 0, genreMax: 0, percentile: 100 };
  }
  const sorted = [...cohort, value].sort((a, b) => a - b);
  const genreMedian = percentile(cohort, 50);
  const genreP75 = percentile(cohort, 75);
  const genreMax = Math.max(...cohort);
  // Rank of `value` within the combined sorted set yields its percentile
  // (using the "<=" definition so ties round up — the friendlier reading).
  const rank = sorted.filter((v) => v <= value).length;
  return {
    value,
    genreMedian,
    genreP75,
    genreMax,
    percentile: (rank / sorted.length) * 100,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Linear-interpolation percentile (a.k.a. "type 7" in R / numpy default).
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) {
    // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
    return sorted[lo]!;
  }
  const frac = rank - lo;
  // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}
