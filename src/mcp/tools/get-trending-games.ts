import { GetTrendingGamesInputSchema, GetTrendingGamesOutputSchema } from "../../shared/schemas.js";
import { ALL_SEED_UNIVERSE_IDS, lookupGenre } from "../data/genre-seeds.js";
import type { ToolDefinition } from "./types.js";

/**
 * Discovery tool: v0.1 'trending' fallback.
 *
 * The core `RobloxClient.getTrendingGames` is a Phase 4 stub (requires the
 * snapshot store to compute real deltas). To avoid shipping a useless tool
 * in Phase 2, this handler implements a v0.1 fallback:
 *
 *   1. Take the curated cross-genre seed pool from `genre-seeds.ts`
 *      (or the per-genre seed list if `genre` is provided).
 *   2. Look every id up via `getGames`.
 *   3. Sort by current `playing` CCU.
 *   4. Return the top N.
 *
 * This proxies 'right-now activity' rather than 'recent growth'. The tool
 * description is explicit about the limitation so the agent does not
 * over-promise to the user.
 */
export const getTrendingGames: ToolDefinition<
  typeof GetTrendingGamesInputSchema,
  typeof GetTrendingGamesOutputSchema
> = {
  name: "get_trending_games",
  description: [
    "Return games that are 'trending now', optionally filtered by `genre`.",
    "Default `limit` is 20 (max 100).",
    "",
    "v0.1 limitation (important — surface this to the user if they ask",
    "for week-over-week growth): true trending requires a historical",
    "snapshot store, which ships in v0.2 (Phase 4). For now this tool",
    "ranks a curated seed list of well-known games by their current",
    "`playing` CCU — effectively 'who is hot right now', not 'who is",
    "growing fastest'. If the user needs growth deltas, tell them the",
    "snapshot store is coming and offer `compare_games` against a peer",
    "set they already track in the meantime.",
    "",
    "When `genre` is provided, only that genre's seed list is ranked.",
    "Supported genres: simulator, role-playing, adventure, fighting,",
    "obby, social, horror, shooter (with common aliases like 'rpg' or",
    "'fps'). Unknown genres fall back to the cross-genre pool.",
  ].join(" "),
  inputSchema: GetTrendingGamesInputSchema,
  outputSchema: GetTrendingGamesOutputSchema,
  handler: async (input, ctx) => {
    const seedIds =
      input.genre !== undefined
        ? (lookupGenre(input.genre)?.universeIds ?? ALL_SEED_UNIVERSE_IDS)
        : ALL_SEED_UNIVERSE_IDS;
    const games = await ctx.client.getGames([...seedIds]);
    const ranked = games.slice().sort((a, b) => b.playing - a.playing);
    return { games: ranked.slice(0, input.limit) };
  },
};
