/**
 * MCP tool: `get_breakout_games`.
 *
 * Hosted-only: games whose trailing-24h CCU is statistically anomalous
 * versus their own prior week (z-score ≥ 2 by default). This is the "what
 * just exploded?" signal — distinct from `get_trending_games` (growth-rate
 * ranking) and `get_up_and_coming` (small-baseline growers).
 */

import { z } from "zod";
import { BloxscoutError } from "../../shared/errors.js";
import { ViewEntrySchema } from "../../shared/hosted-format.js";
import type { ToolContext, ToolDefinition } from "./types.js";

export const getBreakoutGamesInputSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe("Maximum entries returned. Default 20."),
  minZScore: z
    .number()
    .min(0)
    .default(2)
    .describe(
      "Minimum anomaly z-score (trailing 24h vs the game's own prior days). Default 2; scores are capped at 10.",
    ),
});

export const getBreakoutGamesOutputSchema = z.object({
  entries: z.array(ViewEntrySchema),
  generatedAt: z.string(),
  source: z.literal("hosted"),
});

export type GetBreakoutGamesInput = z.infer<typeof getBreakoutGamesInputSchema>;
export type GetBreakoutGamesOutput = z.infer<typeof getBreakoutGamesOutputSchema>;

export async function getBreakoutGamesHandler(
  input: GetBreakoutGamesInput,
  ctx: ToolContext,
): Promise<GetBreakoutGamesOutput> {
  const view = ctx.hosted !== undefined ? await ctx.hosted.getBreakoutsView() : null;
  if (view === null) {
    throw new BloxscoutError(
      "get_breakout_games needs bloxscout's hosted dataset, which is currently unavailable (offline, blocked, or disabled via BLOXSCOUT_NO_HOSTED). There is no local fallback for anomaly detection — retry later, or use get_up_and_coming against your local snapshot store.",
      "INTERNAL_ERROR",
    );
  }
  const entries = view.entries
    .filter((e) => e.zScore24h !== null && e.zScore24h >= input.minZScore)
    .slice(0, input.limit);
  return { entries, generatedAt: view.generatedAt, source: "hosted" };
}

export const getBreakoutGames: ToolDefinition<
  typeof getBreakoutGamesInputSchema,
  typeof getBreakoutGamesOutputSchema
> = {
  name: "get_breakout_games",
  description:
    "Detect games that are SPIKING right now: trailing-24h CCU statistically anomalous vs the game's own prior week (z-score, capped ±10). Served from bloxscout's hosted snapshot dataset (~30 min freshness) — no local setup needed. Use this to catch viral moments early; use `get_trending_games` for growth-rate rankings and `get_genre_momentum` for which niches are rising. Each entry includes playing, avg24h/peak24h, growth24hPct/growth7dPct, zScore24h.",
  inputSchema: getBreakoutGamesInputSchema,
  outputSchema: getBreakoutGamesOutputSchema,
  handler: getBreakoutGamesHandler,
};
