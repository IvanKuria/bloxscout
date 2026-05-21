/**
 * MCP tool: `get_game_history`.
 *
 * Reads a time-series of snapshots for a single universe out of the local
 * `SnapshotStore`. The store must already have data; call `snapshot_game`
 * (or run `bloxscout snapshot --cron`) to populate it.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { GameSnapshot, SnapshotStore } from "../../core/snapshots.js";

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

export type GetGameHistoryInput = z.infer<typeof getGameHistoryInputSchema>;

export interface GetGameHistoryOutput {
  universeId: number;
  snapshots: GameSnapshot[];
}

export interface GetGameHistoryDeps {
  store: SnapshotStore;
}

export function getGameHistory(
  input: GetGameHistoryInput,
  deps: GetGameHistoryDeps,
): GetGameHistoryOutput {
  const since = input.since ? new Date(input.since) : undefined;
  const snapshots = deps.store.getGameHistory(input.universeId, {
    since,
    limit: input.limit,
  });
  return { universeId: input.universeId, snapshots };
}

export const getGameHistoryTool = {
  name: "get_game_history",
  description:
    "Return the local snapshot history for a Roblox universe (playing / visits / favorites over time), newest first. Requires that `snapshot_game` has previously recorded data for this universe.",
  inputSchema: zodToJsonSchema(getGameHistoryInputSchema, { $refStrategy: "none" }),
  handler: getGameHistory,
} as const;
