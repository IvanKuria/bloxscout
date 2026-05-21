/**
 * MCP tool: `get_up_and_coming`.
 *
 * Ranks small-baseline games (default <5,000 baseline players) by snapshot
 * growth-rate. Surfaces "early breakout" titles that the headline trending
 * list misses because the top of `playing` is dominated by perennial
 * juggernauts.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { type TrendingEntry, computeUpAndComing } from "../../core/rankings.js";
import type { SnapshotStore } from "../../core/snapshots.js";

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

export type GetUpAndComingInput = z.infer<typeof getUpAndComingInputSchema>;

export interface GetUpAndComingOutput {
  entries: TrendingEntry[];
}

export interface GetUpAndComingDeps {
  store: SnapshotStore;
}

export function getUpAndComing(
  input: GetUpAndComingInput,
  deps: GetUpAndComingDeps,
): GetUpAndComingOutput {
  const since = input.since ? new Date(input.since) : undefined;
  const entries = computeUpAndComing(deps.store, {
    since,
    minBaselinePlayers: input.minBaselinePlayers,
    limit: input.limit,
  });
  return { entries };
}

export const getUpAndComingTool = {
  name: "get_up_and_coming",
  description:
    "Rank small-baseline games (default <5,000 baseline players) by `playing`-count growth-rate over the snapshot window. Catches breakout titles before they hit the global trending list.",
  inputSchema: zodToJsonSchema(getUpAndComingInputSchema, { $refStrategy: "none" }),
  handler: getUpAndComing,
} as const;
