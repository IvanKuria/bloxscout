import type { GameSummary, RobloxUniverseId } from "../../core/types.js";
import { GetTrendingGamesInputSchema, GetTrendingGamesOutputSchema } from "../../shared/schemas.js";
import { ALL_GENRE_SEARCH_QUERIES, lookupGenre } from "../data/genre-seeds.js";
import type { ToolDefinition } from "./types.js";

const PER_GENRE_CANDIDATES = 25;
const CROSS_GENRE_CANDIDATES_PER_QUERY = 8;
/**
 * Hard cap on the deduped candidate set fed to `getGames`. Roblox's
 * `/v1/games?universeIds=` endpoint rejects requests with more than ~50
 * universe ids ({"errors":[{"code":9,"message":"Too many universe IDs
 * were requested."}]}) despite the historical 100-id batch size, so we
 * trim the cross-genre sweep result to stay well clear.
 */
const MAX_GAMES_LOOKUP = 50;

/**
 * Discovery tool: v0.1 'trending' fallback.
 *
 * The core `RobloxClient.getTrendingGames` is a stub (it requires the
 * Phase 4 snapshot store to compute real growth deltas). To avoid shipping
 * a useless tool now, this handler implements a v0.1 approximation:
 *
 *   1. If `genre` is provided and recognised, pull omni-search results for
 *      that genre keyword.
 *   2. If no `genre` is given (or it's unrecognised), sweep omni-search
 *      across every supported genre keyword and dedupe.
 *   3. Look every candidate up via `getGames` to get live `playing` CCU.
 *   4. Sort by `playing` and return the top N.
 *
 * Pre-v0.1.0 this used a hand-curated universe-id seed list that drifted
 * into template games with 0 CCU (#34); the omni-search-derived approach
 * is self-correcting.
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
    "ranks the live omni-search top results by current `playing` CCU —",
    "effectively 'who is hot right now', not 'who is growing fastest'.",
    "If the user needs growth deltas, tell them the snapshot store is",
    "coming and offer `compare_games` against a peer set they already",
    "track in the meantime.",
    "",
    "When `genre` is provided, only that genre's omni-search results are",
    "ranked. Supported genres: simulator, role-playing, adventure,",
    "fighting, obby, social, horror, shooter (with common aliases like",
    "'rpg' or 'fps'). Unknown genres fall back to a cross-genre sweep.",
  ].join(" "),
  inputSchema: GetTrendingGamesInputSchema,
  outputSchema: GetTrendingGamesOutputSchema,
  handler: async (input, ctx) => {
    const candidateIds = await collectCandidateUniverseIds(ctx, input.genre);
    if (candidateIds.length === 0) {
      return { games: [] };
    }
    const trimmed = candidateIds.slice(0, MAX_GAMES_LOOKUP);
    const games = await ctx.client.getGames(trimmed);
    const ranked = games.slice().sort((a, b) => b.playing - a.playing);
    return { games: ranked.slice(0, input.limit) };
  },
};

async function collectCandidateUniverseIds(
  ctx: { client: import("../../core/roblox-client.js").RobloxClient },
  genre: string | undefined,
): Promise<RobloxUniverseId[]> {
  if (genre !== undefined) {
    const entry = lookupGenre(genre);
    if (entry !== undefined) {
      const summaries = await ctx.client.searchGames(entry.searchQuery, {
        limit: PER_GENRE_CANDIDATES,
      });
      return dedupeByUniverseId(summaries);
    }
    // Unknown genre — fall through to the cross-genre sweep below rather
    // than erroring. The tool's contract has always treated unknown genres
    // as a soft fallback.
  }

  const allSummaries: GameSummary[] = [];
  for (const query of ALL_GENRE_SEARCH_QUERIES) {
    try {
      const batch = await ctx.client.searchGames(query, {
        limit: CROSS_GENRE_CANDIDATES_PER_QUERY,
      });
      allSummaries.push(...batch);
    } catch {
      // Best-effort: a single bad query shouldn't tank the whole sweep.
    }
  }
  return dedupeByUniverseId(allSummaries);
}

function dedupeByUniverseId(summaries: ReadonlyArray<GameSummary>): RobloxUniverseId[] {
  const seen = new Set<RobloxUniverseId>();
  const out: RobloxUniverseId[] = [];
  for (const s of summaries) {
    if (seen.has(s.universeId)) continue;
    seen.add(s.universeId);
    out.push(s.universeId);
  }
  return out;
}
