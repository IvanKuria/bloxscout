import { RobloxNotFoundError } from "../../shared/errors.js";
import {
  GetGamePlayerCountInputSchema,
  GetGamePlayerCountOutputSchema,
} from "../../shared/schemas.js";
import type { ToolDefinition } from "./types.js";

/**
 * Game-intelligence tool: live CCU + lifetime visits projection.
 */
export const getGamePlayerCount: ToolDefinition<
  typeof GetGamePlayerCountInputSchema,
  typeof GetGamePlayerCountOutputSchema
> = {
  name: "get_game_player_count",
  description: [
    "Return current concurrent users (`playing`) and lifetime `visits` for",
    "one game by `universeId`. Backed by the same upstream endpoint as",
    "`get_game` but with a tighter projection — use this when you only",
    "need the live counter and don't want to pull (or cache) the whole",
    "metadata record. Throws ROBLOX_NOT_FOUND if the universe id is",
    "unknown or private.",
  ].join(" "),
  inputSchema: GetGamePlayerCountInputSchema,
  outputSchema: GetGamePlayerCountOutputSchema,
  handler: async (input, ctx) => {
    const counts = await ctx.client.getPlayerCounts([input.universeId]);
    const count = counts[0];
    if (count === undefined) {
      throw new RobloxNotFoundError(
        `get_game_player_count: universeId ${input.universeId} not found`,
        { endpoint: "GET /v1/games" },
      );
    }
    return count;
  },
};
