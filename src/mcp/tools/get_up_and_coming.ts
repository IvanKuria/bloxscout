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
  snapshotCount: z.number().int().nonnegative(),
});

export const getUpAndComingOutputSchema = z.object({
  entries: z.array(trendingEntrySchema),
});

export type GetUpAndComingInput = z.infer<typeof getUpAndComingInputSchema>;
export type GetUpAndComingOutput = z.infer<typeof getUpAndComingOutputSchema>;

export async function getUpAndComingHandler(
  input: GetUpAndComingInput,
  ctx: ToolContext,
): Promise<GetUpAndComingOutput> {
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
  return { entries };
}

export const getUpAndComing: ToolDefinition<
  typeof getUpAndComingInputSchema,
  typeof getUpAndComingOutputSchema
> = {
  name: "get_up_and_coming",
  description:
    "Rank small-baseline games (default <5,000 baseline players) by `playing`-count growth-rate over the snapshot window. Catches breakout titles before they hit the global trending list. Requires a populated snapshot store — call `snapshot_game` for the universes you care about first, ideally on a recurring schedule via `bloxscout snapshot --cron`.",
  inputSchema: getUpAndComingInputSchema,
  outputSchema: getUpAndComingOutputSchema,
  handler: getUpAndComingHandler,
};

/** @deprecated Legacy export retained for the get_up_and_coming test suite. */
export const getUpAndComingTool = getUpAndComing;
