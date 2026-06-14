import { resolveGenreSearchQuery } from "@bloxscout/core/genre-seeds";
import { GetTopByGenreInputSchema, GetTopByGenreOutputSchema } from "@bloxscout/core/schemas";
import type { ToolDefinition } from "./types.js";

/**
 * Discovery tool: top games within a genre.
 *
 * Implementation strategy (v0.1.0+)
 * ---------------------------------
 * Roblox's discovery feed is not exposed via a stable public endpoint, but
 * the omni-search endpoint (`apis.roblox.com/search-api/omni-search`) does
 * return a CCU-sorted live ranking of games for any keyword. We use that
 * to enumerate candidates, then re-fetch the top N via `/v1/games` to get
 * the full `Game` shape (visits, favorites, genre fields, etc.) and rank
 * by the requested metric.
 *
 * The previous implementation used a hand-curated per-genre list of
 * universe ids. That list drifted — many ids resolved to abandoned Studio
 * template games with 0 CCU — and produced misleading rankings. See #34.
 *
 * Cache: `searchGames` and `getGames` are both LRU-cached in
 * `RobloxClient` with `CACHE_TTL.DEFAULT` (300s) — repeat calls for the
 * same genre are effectively free.
 */
export const getTopByGenre: ToolDefinition<
  typeof GetTopByGenreInputSchema,
  typeof GetTopByGenreOutputSchema
> = {
  name: "get_top_by_genre",
  description: [
    "Return the top games in a given Roblox genre, ranked by `playing`",
    "(default), `visits`, or `favoritedCount`. Default `limit` is 20",
    "(max 100). Accepts any genre keyword — common aliases (rpg, fps,",
    "anime, tower-defense, racing, tycoon, battlegrounds, fighting, obby,",
    "etc.) are normalized to canonical Roblox search terms; unknown",
    "keywords pass through to Roblox's omni-search verbatim.",
    "",
    "Implementation: candidates come from Roblox's live omni-search ranking",
    "for the genre keyword (self-correcting as popularity shifts), then the",
    "top results are re-fetched via `games.roblox.com/v1/games` to populate",
    "the full metric set and re-ranked by the chosen `rankBy` field.",
    "",
    "Use this when the user asks 'what are the top Simulator games right",
    "now?' or 'which RPGs are the biggest by visits?'. For week-over-week",
    "growth or true 'trending', use `get_trending_games`.",
  ].join(" "),
  inputSchema: GetTopByGenreInputSchema,
  outputSchema: GetTopByGenreOutputSchema,
  handler: async (input, ctx) => {
    // v0.1.2 (#40): removed the SUPPORTED_GENRES allowlist gate. Known
    // aliases (e.g. "rpg" -> "role-playing") still resolve to their canonical
    // search query; unknown keywords pass through verbatim to omni-search,
    // which natively handles popular long-tail genres (tower-defense, anime,
    // racing, tycoon, battlegrounds, ...) the curated table never covered.
    const searchQuery = resolveGenreSearchQuery(input.genre);
    // Pull a wider candidate pool than `limit` so the post-fetch re-rank by
    // visits / favorites still has something to reorder. Capped at 50: the
    // omni-search response is paginated and pulling deeper rarely surfaces
    // games anyone cares about.
    const candidatePoolSize = Math.min(50, Math.max(input.limit * 3, 25));
    const summaries = await ctx.client.searchGames(searchQuery, {
      limit: candidatePoolSize,
    });
    if (summaries.length === 0) {
      return { games: [] };
    }
    // Pre-rank summaries by their (search-side) playerCount so when we
    // fetch full Game records we hit the top games first — important when
    // omni-search returned more candidates than we will ultimately keep.
    const topUniverseIds = summaries
      .slice()
      .sort((a, b) => b.playerCount - a.playerCount)
      .map((s) => s.universeId);
    const games = await ctx.client.getGames(topUniverseIds);
    const metric = input.rankBy;
    const ranked = games.slice().sort((a, b) => b[metric] - a[metric]);
    return { games: ranked.slice(0, input.limit) };
  },
};
