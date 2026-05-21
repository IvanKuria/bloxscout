/**
 * MCP tool: `snapshot_game`.
 *
 * Fetches current game state from Roblox via `RobloxClient.getGames` and
 * persists each result to the local `SnapshotStore`. Phase 2 will wire this
 * descriptor into the MCP server's tool router; until then it lives here so
 * the tool surface is reviewable and unit-testable in isolation.
 */

import { z } from "zod";
import { BloxscoutError } from "../../shared/errors.js";
import type { ToolContext, ToolDefinition } from "./types.js";

export const snapshotGameInputSchema = z.object({
  universeIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(100)
    .describe("Universe IDs to snapshot. Capped at 100 (Roblox's per-request batch limit)."),
});

export const snapshotGameOutputSchema = z.object({
  recorded: z.number().int().nonnegative(),
  takenAt: z.string(),
  universeIds: z.array(z.number().int().positive()),
});

export type SnapshotGameInput = z.infer<typeof snapshotGameInputSchema>;
export type SnapshotGameOutput = z.infer<typeof snapshotGameOutputSchema>;

export async function snapshotGameHandler(
  input: SnapshotGameInput,
  ctx: ToolContext,
): Promise<SnapshotGameOutput> {
  if (ctx.store === undefined) {
    throw new BloxscoutError(
      "snapshot_game requires a SnapshotStore in context.",
      "INTERNAL_ERROR",
    );
  }
  const games = await ctx.client.getGames(input.universeIds);
  const { recorded, takenAt } = ctx.store.recordSnapshot(games);
  return {
    recorded,
    takenAt,
    universeIds: games.map((g) => g.id),
  };
}

export const snapshotGame: ToolDefinition<
  typeof snapshotGameInputSchema,
  typeof snapshotGameOutputSchema
> = {
  name: "snapshot_game",
  description:
    "Capture a point-in-time snapshot of one or more Roblox games (playing, visits, favoritedCount) into the local store. Re-run periodically (manually or via `bloxscout snapshot --cron`) to build a time-series the rankings tools can mine.",
  inputSchema: snapshotGameInputSchema,
  outputSchema: snapshotGameOutputSchema,
  handler: snapshotGameHandler,
};

/** @deprecated Legacy export retained for the snapshot_game test suite. */
export const snapshotGameTool = snapshotGame;
