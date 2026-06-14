/**
 * MCP tool: `get_genre_momentum`.
 *
 * Hosted-only: genre-level aggregates (summed CCU, 24h/7d growth of the
 * genre as a whole, top games) across every genre the pipeline tracks.
 * This answers "which niches are heating up?" — the question that decides
 * what to build next — which no per-game tool can.
 */

import { BloxscoutError } from "@bloxscout/core/errors";
import { GenreAggregateSchema } from "@bloxscout/core/hosted-format";
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types.js";

export const getGenreMomentumInputSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .describe("Maximum genres returned (sorted by total CCU). Default: all tracked genres."),
  sortBy: z
    .enum(["totalPlaying", "growth24hPct", "growth7dPct"])
    .default("totalPlaying")
    .describe("Ranking metric. Use growth sorts to surface rising niches."),
});

export const getGenreMomentumOutputSchema = z.object({
  genres: z.array(GenreAggregateSchema),
  generatedAt: z.string(),
  source: z.literal("hosted"),
});

export type GetGenreMomentumInput = z.infer<typeof getGenreMomentumInputSchema>;
export type GetGenreMomentumOutput = z.infer<typeof getGenreMomentumOutputSchema>;

export async function getGenreMomentumHandler(
  input: GetGenreMomentumInput,
  ctx: ToolContext,
): Promise<GetGenreMomentumOutput> {
  const view = ctx.hosted !== undefined ? await ctx.hosted.getGenresView() : null;
  if (view === null) {
    throw new BloxscoutError(
      "get_genre_momentum needs bloxscout's hosted dataset, which is currently unavailable (offline, blocked, or disabled via BLOXSCOUT_NO_HOSTED). There is no local fallback for genre aggregates — retry later, or use get_top_by_genre for a live point-in-time view of one genre.",
      "INTERNAL_ERROR",
    );
  }
  const sorted = [...view.genres].sort((a, b) => {
    if (input.sortBy === "totalPlaying") return b.totalPlaying - a.totalPlaying;
    const key = input.sortBy;
    return (b[key] ?? Number.NEGATIVE_INFINITY) - (a[key] ?? Number.NEGATIVE_INFINITY);
  });
  const genres = input.limit !== undefined ? sorted.slice(0, input.limit) : sorted;
  return { genres, generatedAt: view.generatedAt, source: "hosted" };
}

export const getGenreMomentum: ToolDefinition<
  typeof getGenreMomentumInputSchema,
  typeof getGenreMomentumOutputSchema
> = {
  name: "get_genre_momentum",
  description:
    "Rank Roblox genres by momentum: per-genre summed CCU with 24h and 7d growth of the genre as a whole, plus each genre's top games. Served from bloxscout's hosted snapshot dataset (~30 min freshness, genre = Roblox's genre_l1 taxonomy) — no local setup needed. Sort by growth24hPct/growth7dPct to find rising niches worth building in; sort by totalPlaying (default) for market size. Complements `get_trending_games` (per-game) and `find market gaps`-style analyses.",
  inputSchema: getGenreMomentumInputSchema,
  outputSchema: getGenreMomentumOutputSchema,
  handler: getGenreMomentumHandler,
};
