import { BloxscoutError } from "../../shared/errors.js";
import { GetTopByGenreInputSchema, GetTopByGenreOutputSchema } from "../../shared/schemas.js";
import { SUPPORTED_GENRES, lookupGenre } from "../data/genre-seeds.js";
import type { ToolDefinition } from "./types.js";

/**
 * Discovery tool: top games within a genre.
 *
 * v0.1 implementation strategy
 * ----------------------------
 * Roblox's discovery feed (the source rotrends uses) is not exposed via a
 * stable public endpoint. To ship something useful in Phase 2 we hand-curate
 * a per-genre seed list of well-known top games, look each one up via
 * `getGames`, then rank the resolved set by the requested metric.
 *
 * Trade-offs:
 * - + Deterministic, cacheable, no rate-limit risk.
 * - + Catches the long-tail leaders agents are most often asked about.
 * - - Will not surface a brand-new breakout hit until the seed list is updated.
 * - - Limited to the genres in `genre-seeds.ts`; unknown genres throw
 *     VALIDATION_ERROR with the list of supported slugs.
 *
 * v0.2 will replace the seed list with a rolling snapshot of the actual
 * discovery feed stored in `~/.bloxscout/data.db` (Phase 4).
 */
export const getTopByGenre: ToolDefinition<
  typeof GetTopByGenreInputSchema,
  typeof GetTopByGenreOutputSchema
> = {
  name: "get_top_by_genre",
  description: [
    "Return the top games in a given Roblox genre, ranked by `playing`",
    "(default), `visits`, or `favoritedCount`. Default `limit` is 20",
    "(max 100). Supported genre slugs: simulator, role-playing, adventure,",
    "fighting, obby, social, horror, shooter. Common aliases (e.g. 'rpg'",
    "for role-playing, 'fps' for shooter) are accepted.",
    "",
    "v0.1 implementation: the candidate set is a hand-curated list of",
    "10-20 well-known leaders per genre, looked up live via",
    "`games.roblox.com/v1/games` and sorted by the chosen metric. This",
    "captures established hits very well but will not surface brand-new",
    "breakouts until the seed list is refreshed. v0.2 (Phase 4) will use",
    "the local snapshot store instead.",
    "",
    "Use this when the user asks 'what are the top Simulator games right",
    "now?' or 'which RPGs are the biggest by visits?'. For week-over-week",
    "growth or true 'trending', use `get_trending_games` (also v0.1).",
  ].join(" "),
  inputSchema: GetTopByGenreInputSchema,
  outputSchema: GetTopByGenreOutputSchema,
  handler: async (input, ctx) => {
    const entry = lookupGenre(input.genre);
    if (entry === undefined) {
      throw new BloxscoutError(
        `get_top_by_genre: unsupported genre "${input.genre}". Supported: ${SUPPORTED_GENRES.join(
          ", ",
        )}.`,
        "VALIDATION_ERROR",
      );
    }
    const games = await ctx.client.getGames([...entry.universeIds]);
    const metric = input.rankBy;
    const ranked = games.slice().sort((a, b) => b[metric] - a[metric]);
    return { games: ranked.slice(0, input.limit) };
  },
};
