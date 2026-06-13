import type { GameSummary, RobloxUniverseId } from "../../core/types.js";
import {
  GetTrendingGamesInputSchema,
  type GetTrendingGamesOutput,
  GetTrendingGamesOutputSchema,
} from "../../shared/schemas.js";
import { ALL_GENRE_SEARCH_QUERIES, lookupGenre, matchesHostedGenre } from "../data/genre-seeds.js";
import type { ToolContext, ToolDefinition } from "./types.js";

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
 * Discovery tool: trending games.
 *
 * v0.2 primary path: the hosted `bloxscout-data` trending view — REAL
 * 24h/7d CCU growth computed from the central snapshot pipeline, available
 * from the very first call with no local history required. Entries are
 * re-hydrated into full `Game` objects (one batched `/v1/games` call) with
 * `growth24hPct` / `growth7dPct` / `zScore24h` merged in, and the response
 * carries `source: "hosted"` plus the dataset's `generatedAt`.
 *
 * Fallback (offline, `BLOXSCOUT_NO_HOSTED=1`, CDN failure, or a genre the
 * hosted taxonomy can't match): the v0.1 live approximation — omni-search
 * candidates ranked by current `playing` CCU, `source: "live"`.
 */
export const getTrendingGames: ToolDefinition<
  typeof GetTrendingGamesInputSchema,
  typeof GetTrendingGamesOutputSchema
> = {
  name: "get_trending_games",
  description: [
    "Return trending games, optionally filtered by `genre`. Default `limit`",
    "is 20 (max 100).",
    "",
    "Primary data source is bloxscout's hosted snapshot dataset: games are",
    "ranked by real 24h CCU growth (with 7d growth and a breakout z-score",
    "included per game), refreshed about every 30 minutes. The response's",
    "`source` field says which path served it: 'hosted' = growth ranking,",
    "'live' = fallback ranking by current CCU only (used when the hosted",
    "dataset is unreachable or the genre has no hosted matches).",
    "",
    "Genres: seed slugs like simulator, rpg, obby, horror, shooter (plus",
    "aliases) map onto Roblox's genre taxonomy; other keywords are matched",
    "fuzzily against taxonomy names ('survival', 'sports') or fall back to",
    "a live omni-search sweep. For deeper genre analytics, see",
    "`get_genre_momentum` and `get_breakout_games`.",
  ].join(" "),
  inputSchema: GetTrendingGamesInputSchema,
  outputSchema: GetTrendingGamesOutputSchema,
  handler: async (input, ctx) => {
    const hosted = await tryHostedPath(input, ctx);
    if (hosted !== null) return hosted;

    // Live fallback: omni-search candidates ranked by current CCU.
    const candidateIds = await collectCandidateUniverseIds(ctx, input.genre);
    if (candidateIds.length === 0) {
      return { games: [], source: "live" };
    }
    const trimmed = candidateIds.slice(0, MAX_GAMES_LOOKUP);
    const games = await ctx.client.getGames(trimmed);
    const ranked = games.slice().sort((a, b) => b.playing - a.playing);
    return { games: ranked.slice(0, input.limit), source: "live" };
  },
};

async function tryHostedPath(
  input: { genre?: string; limit: number },
  ctx: ToolContext,
): Promise<GetTrendingGamesOutput | null> {
  if (ctx.hosted === undefined) return null;
  const view = await ctx.hosted.getTrendingView();
  if (view === null) return null;

  const filtered =
    input.genre === undefined
      ? view.entries
      : view.entries.filter((e) => matchesHostedGenre(input.genre as string, e.genre));
  // No hosted matches for this genre — let the live sweep try the keyword.
  if (filtered.length === 0) return null;

  const top = filtered.slice(0, input.limit);
  const games = await ctx.client.getGames(top.map((e) => e.universeId));
  const byId = new Map(games.map((g) => [g.id, g]));
  const merged = [];
  for (const entry of top) {
    const game = byId.get(entry.universeId);
    if (game === undefined) continue;
    merged.push({
      ...game,
      growth24hPct: entry.growth24hPct,
      growth7dPct: entry.growth7dPct,
      zScore24h: entry.zScore24h,
    });
  }
  return { games: merged, source: "hosted", dataGeneratedAt: view.generatedAt };
}

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
