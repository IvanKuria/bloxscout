import { CompareGamesInputSchema, GameSchema } from "@bloxscout/core/schemas";
import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const MetricStatsSchema = z.object({
  min: z.number(),
  max: z.number(),
  median: z.number(),
});

export const CompareGamesToolOutputSchema = z.object({
  games: z.array(GameSchema),
  metrics: z.object({
    playing: MetricStatsSchema,
    visits: MetricStatsSchema,
    favoritedCount: MetricStatsSchema,
  }),
  missingUniverseIds: z.array(z.number().int().positive()),
});

/**
 * Game-intelligence tool: side-by-side comparison of 2-10 games.
 */
export const compareGames: ToolDefinition<
  typeof CompareGamesInputSchema,
  typeof CompareGamesToolOutputSchema
> = {
  name: "compare_games",
  description: [
    "Compare 2 to 10 Roblox games side-by-side. Returns the full `Game`",
    "record for every universe id that resolved, plus a `metrics` summary",
    "with the min/max/median of `playing` (live CCU), `visits` (lifetime),",
    "and `favoritedCount` across the set. Any universe ids that did not",
    "resolve are listed in `missingUniverseIds` instead of failing the call.",
    "",
    "Use this when the user asks 'how do these N games stack up?' or wants",
    "to benchmark one game against a hand-picked peer set. For benchmarking",
    "against a genre cohort instead, use `analyze_game_vs_genre`.",
  ].join(" "),
  inputSchema: CompareGamesInputSchema,
  outputSchema: CompareGamesToolOutputSchema,
  handler: async (input, ctx) => {
    const games = await ctx.client.getGames(input.universeIds);
    const resolvedIds = new Set(games.map((g) => g.id));
    const missingUniverseIds = input.universeIds.filter((id) => !resolvedIds.has(id));
    return {
      games,
      metrics: {
        playing: stats(games.map((g) => g.playing)),
        visits: stats(games.map((g) => g.visits)),
        favoritedCount: stats(games.map((g) => g.favoritedCount)),
      },
      missingUniverseIds,
    };
  },
};

/**
 * Compute min / max / median over a numeric series. Empty input yields all
 * zeros so the output schema (which forbids NaN) stays valid even when every
 * universe id missed.
 */
function stats(values: number[]): { min: number; max: number; median: number } {
  if (values.length === 0) return { min: 0, max: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
        (sorted[mid - 1]! + sorted[mid]!) / 2
      : // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
        sorted[mid]!;
  return {
    // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
    min: sorted[0]!,
    // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
    max: sorted[sorted.length - 1]!,
    median,
  };
}
