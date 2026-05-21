import { RobloxNotFoundError } from "../../shared/errors.js";
import { GetGameInputSchema, GetGameOutputSchema } from "../../shared/schemas.js";
import type { ToolDefinition } from "./types.js";

/**
 * Game-intelligence tool: full metadata lookup for a single universe id.
 */
export const getGame: ToolDefinition<typeof GetGameInputSchema, typeof GetGameOutputSchema> = {
  name: "get_game",
  description: [
    "Fetch the full record for one Roblox game by its `universeId`.",
    "Returns name, description, creator, genre, current `playing` CCU,",
    "lifetime `visits`, `favoritedCount`, vote tallies, created/updated",
    "timestamps, and more — backed by `games.roblox.com/v1/games`.",
    "",
    "Use this once you have a universe id (from `search_games`, a URL,",
    "or the user). For just live CCU prefer `get_game_player_count`",
    "(cheaper / tighter cache). For side-by-side comparison of multiple",
    "games, prefer `compare_games`. Throws ROBLOX_NOT_FOUND if the",
    "universe id does not resolve to a public game.",
  ].join(" "),
  inputSchema: GetGameInputSchema,
  outputSchema: GetGameOutputSchema,
  handler: async (input, ctx) => {
    const games = await ctx.client.getGames([input.universeId]);
    const game = games[0];
    if (game === undefined) {
      throw new RobloxNotFoundError(`get_game: universeId ${input.universeId} not found`, {
        endpoint: "GET /v1/games",
      });
    }
    return { game };
  },
};
