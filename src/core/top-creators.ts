/**
 * Aggregate "top creators by genre" from Roblox's live omni-search ranking.
 *
 * v0.1.0+: Roblox does not expose a public "top creators by genre" endpoint.
 * We approximate it by:
 *
 *   1. Resolving the genre alias to a search keyword (see
 *      `src/mcp/data/genre-seeds.ts`).
 *   2. Calling `RobloxClient.searchGames` (the omni-search endpoint) to
 *      enumerate the live top games for that keyword. This replaces the
 *      hand-curated universe-id seed list that previously drifted into
 *      Studio templates with 0 CCU — see #34.
 *   3. Fetching full `Game` metadata via `RobloxClient.getGames` so we
 *      have creator records.
 *   4. Grouping by `creator.id`, summing `playing` (CCU) across each
 *      creator's games in the result set.
 *   5. Returning the top-N creators by total CCU, with the most-played
 *      game surfaced as an example.
 *
 * v0.2 (post-Phase 4 snapshot store): the same tool shape will switch to
 * scanning the local snapshot store, giving a real-time leaderboard with
 * day-over-day deltas. The signature is designed to be stable across that
 * swap.
 */

import { resolveGenreSearchQuery } from "../mcp/data/genre-seeds.js";
import { BloxscoutError } from "../shared/errors.js";
import type { RobloxClient } from "./roblox-client.js";
import type { Game, RobloxUniverseId } from "./types.js";

/** Wider than `limit` so creators with multiple top games can still aggregate. */
const CANDIDATE_POOL_SIZE = 50;

export interface GetTopCreatorsByGenreOptions {
  /** Max creators to return. Default 10. */
  limit?: number;
}

export interface TopCreatorEntry {
  /** Roblox creator id (user id if `creatorType === "User"`, group id otherwise). */
  creatorId: number;
  /** `"User"` or `"Group"`, as reported by Roblox on the source games. */
  creatorType: "User" | "Group";
  /** Display name as it appeared on one of the creator's games. */
  creatorName: string;
  /**
   * Sum of `playing` (live CCU) across this creator's games in the
   * omni-search top results for the genre. (Field name preserved for
   * backwards compatibility with the v0.0.x seed-list shape.)
   */
  totalPlayingAcrossSeedGames: number;
  /** How many of the creator's games appeared in the genre's top results. */
  gameCount: number;
  /** The creator's most-played game from the result set (by CCU). */
  topGame: {
    universeId: RobloxUniverseId;
    name: string;
    playing: number;
  };
}

interface CreatorAccumulator {
  creatorId: number;
  creatorType: "User" | "Group";
  creatorName: string;
  totalPlaying: number;
  gameCount: number;
  topGame: { universeId: RobloxUniverseId; name: string; playing: number };
}

/**
 * Identify the top creators within a genre by summing live CCU across the
 * omni-search top games for that genre.
 *
 * Throws `VALIDATION_ERROR` for unknown genres or non-positive `limit`.
 */
export async function getTopCreatorsByGenre(
  client: RobloxClient,
  genre: string,
  opts: GetTopCreatorsByGenreOptions = {},
): Promise<TopCreatorEntry[]> {
  if (typeof genre !== "string" || genre.trim().length === 0) {
    throw new BloxscoutError(
      "getTopCreatorsByGenre: genre must be a non-empty string",
      "VALIDATION_ERROR",
    );
  }
  const limit = opts.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new BloxscoutError(
      "getTopCreatorsByGenre: limit must be a positive integer",
      "VALIDATION_ERROR",
    );
  }

  // v0.1.2 (#40): removed the SUPPORTED_GENRES allowlist gate. Known aliases
  // (e.g. "rpg" -> "role-playing") still resolve to a canonical search query;
  // unknown keywords pass through verbatim to omni-search so the long tail of
  // popular Roblox genres (tower-defense, anime, racing, tycoon, ...) just
  // works.
  const searchQuery = resolveGenreSearchQuery(genre);

  const summaries = await client.searchGames(searchQuery, { limit: CANDIDATE_POOL_SIZE });
  if (summaries.length === 0) return [];

  const ids = summaries.map((s) => s.universeId);
  const games = await client.getGames(ids);

  const byCreator = new Map<number, CreatorAccumulator>();
  for (const game of games) {
    aggregate(byCreator, game);
  }

  const ranked: TopCreatorEntry[] = [...byCreator.values()]
    .sort((a, b) => {
      if (b.totalPlaying !== a.totalPlaying) return b.totalPlaying - a.totalPlaying;
      if (b.gameCount !== a.gameCount) return b.gameCount - a.gameCount;
      return a.creatorId - b.creatorId;
    })
    .slice(0, limit)
    .map((c) => ({
      creatorId: c.creatorId,
      creatorType: c.creatorType,
      creatorName: c.creatorName,
      totalPlayingAcrossSeedGames: c.totalPlaying,
      gameCount: c.gameCount,
      topGame: c.topGame,
    }));

  return ranked;
}

function aggregate(byCreator: Map<number, CreatorAccumulator>, game: Game): void {
  const existing = byCreator.get(game.creator.id);
  if (existing === undefined) {
    byCreator.set(game.creator.id, {
      creatorId: game.creator.id,
      creatorType: game.creator.type,
      creatorName: game.creator.name,
      totalPlaying: game.playing,
      gameCount: 1,
      topGame: { universeId: game.id, name: game.name, playing: game.playing },
    });
    return;
  }
  existing.totalPlaying += game.playing;
  existing.gameCount += 1;
  if (game.playing > existing.topGame.playing) {
    existing.topGame = { universeId: game.id, name: game.name, playing: game.playing };
  }
}
