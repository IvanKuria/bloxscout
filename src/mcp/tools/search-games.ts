import { SearchGamesInputSchema, SearchGamesOutputSchema } from "@bloxscout/core/schemas";
import type { ToolDefinition } from "./types.js";

/**
 * Discovery tool: keyword search over Roblox's omni-search corpus.
 *
 * Use this when the user only knows the name (or part of the name) of a
 * game and needs to resolve it to a `universeId` they can pass to the
 * intelligence tools (`get_game`, `compare_games`, `analyze_game_vs_genre`).
 * Do NOT use it for ranking by popularity — for that, prefer
 * `get_top_by_genre` or `get_trending_games`.
 */
export const searchGames: ToolDefinition<
  typeof SearchGamesInputSchema,
  typeof SearchGamesOutputSchema
> = {
  name: "search_games",
  description: [
    "Search Roblox's catalog by free-text keyword and return up to `limit`",
    "matching games (default 25, max 100). Each result is a lightweight",
    "GameSummary with `universeId`, `name`, `description`, current `playerCount`,",
    "vote counts, and creator info — enough for the agent to pick a target",
    "and then call `get_game` for the full record.",
    "",
    "Best used when: the user names a game ('Adopt Me', 'Tower of Hell') or",
    "an idea ('zombie survival', 'farming sim') and needs to find universe ids.",
    "Not the right tool for: ranking (use `get_top_by_genre`), live CCU",
    "(use `get_game_player_count`), or trend signal (use `get_trending_games`).",
  ].join(" "),
  inputSchema: SearchGamesInputSchema,
  outputSchema: SearchGamesOutputSchema,
  handler: async (input, ctx) => {
    const results = await ctx.client.searchGames(input.keyword, { limit: input.limit });
    return { results };
  },
};
