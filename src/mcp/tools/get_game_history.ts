/**
 * MCP tool: `get_game_history`.
 *
 * Reads a time-series of snapshots for a single universe out of the local
 * `SnapshotStore`. The store must already have data; call `snapshot_game`
 * (or run `bloxscout snapshot --cron`) to populate it.
 */

import { z } from "zod";
import { BloxscoutError } from "../../shared/errors.js";
import type { ToolContext, ToolDefinition } from "./types.js";

export const getGameHistoryInputSchema = z.object({
  universeId: z.number().int().positive().describe("Roblox universe ID to read history for."),
  since: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("Inclusive ISO 8601 lower bound on `takenAt`. Defaults to the beginning of time."),
  limit: z
    .number()
    .int()
    .positive()
    .max(10_000)
    .optional()
    .describe("Maximum rows to return, newest first. Defaults to 100."),
});

const gameSnapshotSchema = z.object({
  universeId: z.number(),
  takenAt: z.string(),
  playing: z.number(),
  visits: z.number(),
  favoritedCount: z.number(),
  totalUpVotes: z.number(),
  totalDownVotes: z.number(),
});

export const getGameHistoryOutputSchema = z.object({
  universeId: z.number().int().positive(),
  snapshots: z.array(gameSnapshotSchema),
});

export type GetGameHistoryInput = z.infer<typeof getGameHistoryInputSchema>;
export type GetGameHistoryOutput = z.infer<typeof getGameHistoryOutputSchema>;

export async function getGameHistoryHandler(
  input: GetGameHistoryInput,
  ctx: ToolContext,
): Promise<GetGameHistoryOutput> {
  if (ctx.store === undefined) {
    throw new BloxscoutError(
      "get_game_history requires a SnapshotStore in context.",
      "INTERNAL_ERROR",
    );
  }
  const since = input.since ? new Date(input.since) : undefined;
  const snapshots = ctx.store.getGameHistory(input.universeId, {
    since,
    limit: input.limit,
  });
  return { universeId: input.universeId, snapshots };
}

export const getGameHistory: ToolDefinition<
  typeof getGameHistoryInputSchema,
  typeof getGameHistoryOutputSchema
> = {
  name: "get_game_history",
  description:
    "Return the local snapshot history for a Roblox universe (playing / visits / favorites over time), newest first. Requires that `snapshot_game` has previously recorded data for this universe — call that tool first (or run `bloxscout snapshot --cron` to populate continuously).",
  inputSchema: getGameHistoryInputSchema,
  outputSchema: getGameHistoryOutputSchema,
  handler: getGameHistoryHandler,
};

/** @deprecated Legacy export retained for the get_game_history test suite. */
export const getGameHistoryTool = getGameHistory;
