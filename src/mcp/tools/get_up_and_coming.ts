/**
 * MCP tool: `get_up_and_coming`.
 *
 * Ranks small-baseline games (default <5,000 baseline players) by snapshot
 * growth-rate. Surfaces "early breakout" titles that the headline trending
 * list misses because the top of `playing` is dominated by perennial
 * juggernauts.
 */

import { z } from "zod";
import { computeUpAndComing } from "../../core/rankings.js";
import { BloxscoutError } from "../../shared/errors.js";
import type { ToolContext, ToolDefinition } from "./types.js";

export const getUpAndComingInputSchema = z.object({
  since: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("Lower bound on snapshot window. Defaults to now - 24h."),
  minBaselinePlayers: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "Ceiling on the oldest-in-window `playing` count. Default 5000. Games above this baseline are filtered out.",
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Maximum rows returned. Default 25."),
});

const trendingEntrySchema = z.object({
  universeId: z.number(),
  name: z.string().nullable(),
  currentPlaying: z.number(),
  deltaPct: z.number(),
  /** Local-source rows only; hosted rows omit it (pipeline cadence is fixed). */
  snapshotCount: z.number().int().nonnegative().optional(),
});

export const getUpAndComingOutputSchema = z.object({
  entries: z.array(trendingEntrySchema),
  /** `hosted` = central dataset (24h window); `local` = your snapshot store. */
  source: z.enum(["hosted", "local"]).optional(),
});

export type GetUpAndComingInput = z.infer<typeof getUpAndComingInputSchema>;
export type GetUpAndComingOutput = z.infer<typeof getUpAndComingOutputSchema>;

export async function getUpAndComingHandler(
  input: GetUpAndComingInput,
  ctx: ToolContext,
): Promise<GetUpAndComingOutput> {
  // The hosted view is computed with the default window (24h) and baseline
  // (<5000), so custom values must route to the local store where they can
  // actually be honoured.
  const wantsDefaults = input.since === undefined && input.minBaselinePlayers === undefined;
  if (wantsDefaults && ctx.hosted !== undefined) {
    const view = await ctx.hosted.getUpAndComingView();
    if (view !== null) {
      const limit = input.limit ?? 25;
      return {
        entries: view.entries.slice(0, limit).map((e) => ({
          universeId: e.universeId,
          name: e.name,
          currentPlaying: e.playing,
          deltaPct: e.growth24hPct ?? 0,
        })),
        source: "hosted",
      };
    }
  }

  if (ctx.store === undefined) {
    throw new BloxscoutError(
      "get_up_and_coming requires a SnapshotStore in context.",
      "INTERNAL_ERROR",
    );
  }
  const since = input.since ? new Date(input.since) : undefined;
  const entries = computeUpAndComing(ctx.store, {
    since,
    minBaselinePlayers: input.minBaselinePlayers,
    limit: input.limit,
  });
  return { entries, source: "local" };
}

export const getUpAndComing: ToolDefinition<
  typeof getUpAndComingInputSchema,
  typeof getUpAndComingOutputSchema
> = {
  name: "get_up_and_coming",
  description:
    "Rank small-baseline games (default <5,000 baseline players) by `playing`-count growth-rate. Catches breakout titles before they hit the global trending list. With default inputs this serves bloxscout's hosted dataset (24h growth across ~10k+ tracked games, no setup needed; `source: 'hosted'`). Passing a custom `since` or `minBaselinePlayers` switches to your local snapshot store (`source: 'local'`), which requires prior `snapshot_game` runs. See also `get_breakout_games` for anomaly-scored spikes.",
  inputSchema: getUpAndComingInputSchema,
  outputSchema: getUpAndComingOutputSchema,
  handler: getUpAndComingHandler,
};

/** @deprecated Legacy export retained for the get_up_and_coming test suite. */
export const getUpAndComingTool = getUpAndComing;
