/**
 * MCP tool: `snapshot_game`.
 *
 * Fetches current game state from Roblox via `RobloxClient.getGames` and
 * persists each result to the local `SnapshotStore`. Phase 2 will wire this
 * descriptor into the MCP server's tool router; until then it lives here so
 * the tool surface is reviewable and unit-testable in isolation.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { RobloxClient } from "../../core/roblox-client.js";
import type { SnapshotStore } from "../../core/snapshots.js";

export const snapshotGameInputSchema = z.object({
  universeIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(100)
    .describe("Universe IDs to snapshot. Capped at 100 (Roblox's per-request batch limit)."),
});

export type SnapshotGameInput = z.infer<typeof snapshotGameInputSchema>;

export interface SnapshotGameOutput {
  recorded: number;
  takenAt: string;
  universeIds: number[];
}

export interface SnapshotGameDeps {
  client: RobloxClient;
  store: SnapshotStore;
}

export async function snapshotGame(
  input: SnapshotGameInput,
  deps: SnapshotGameDeps,
): Promise<SnapshotGameOutput> {
  const games = await deps.client.getGames(input.universeIds);
  const { recorded, takenAt } = deps.store.recordSnapshot(games);
  return {
    recorded,
    takenAt,
    universeIds: games.map((g) => g.id),
  };
}

export const snapshotGameTool = {
  name: "snapshot_game",
  description:
    "Capture a point-in-time snapshot of one or more Roblox games (playing, visits, favoritedCount) into the local store. Re-run periodically to build a time-series the rankings tools can mine.",
  inputSchema: zodToJsonSchema(snapshotGameInputSchema, { $refStrategy: "none" }),
  handler: snapshotGame,
} as const;
