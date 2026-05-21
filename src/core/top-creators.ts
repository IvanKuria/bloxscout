/**
 * Aggregate "top creators by genre" from the curated seed list in
 * {@link ./seed-data.ts}.
 *
 * v0.1 (Phase 5a): Roblox does not expose a public "top creators by genre"
 * endpoint. We approximate it by:
 *
 *   1. Looking up a curated 10-20 game seed list for the requested genre.
 *   2. Fetching live `Game` metadata via `RobloxClient.getGames` (one batched
 *      request, cached).
 *   3. Grouping by `creator.id`, summing `playing` (CCU) across each
 *      creator's seed-list games.
 *   4. Returning the top-N creators by total CCU, with the most-played game
 *      surfaced as an example.
 *
 * v0.2 (post-Phase 4 snapshot store): the same tool shape will switch to
 * scanning the local snapshot store, giving a real-time leaderboard with
 * day-over-day deltas. The MCP tool signature is designed to be stable
 * across that swap.
 */

import { BloxscoutError } from "../shared/errors.js";
import type { RobloxClient } from "./roblox-client.js";
import { SUPPORTED_SEED_GENRES, getSeedUniverseIds } from "./seed-data.js";
import type { Game, RobloxUniverseId } from "./types.js";

export interface GetTopCreatorsByGenreOptions {
  /** Max creators to return. Default 10. */
  limit?: number;
}

export interface TopCreatorEntry {
  /** Roblox creator id (user id if `creatorType === "User"`, group id otherwise). */
  creatorId: number;
  /** `"User"` or `"Group"`, as reported by Roblox on the seed games. */
  creatorType: "User" | "Group";
  /** Display name as it appeared on one of the creator's seed-list games. */
  creatorName: string;
  /** Sum of `playing` (live CCU) across this creator's games in the seed list. */
  totalPlayingAcrossSeedGames: number;
  /** How many of the creator's games appeared in the seed list. */
  gameCount: number;
  /** The creator's most-played seed-list game (by CCU). */
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
 * curated seed list. See module-level docstring for the v0.1 / v0.2 plan.
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

  const seedIds = getSeedUniverseIds(genre);
  if (seedIds === undefined) {
    throw new BloxscoutError(
      `getTopCreatorsByGenre: unknown genre '${genre}'. Supported genres: ${SUPPORTED_SEED_GENRES.join(", ")}`,
      "VALIDATION_ERROR",
    );
  }

  const games = await client.getGames([...seedIds]);
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
