import { describe, expect, it, vi } from "vitest";
import type { RobloxClient } from "../../src/core/roblox-client.js";
import { getTopCreatorsByGenre } from "../../src/core/top-creators.js";
import type { Game } from "../../src/core/types.js";
import { BloxscoutError } from "../../src/shared/errors.js";

function makeGame(opts: {
  id: number;
  playing: number;
  creator: { id: number; name: string; type?: "User" | "Group" };
  name?: string;
}): Game {
  return {
    id: opts.id,
    rootPlaceId: opts.id * 10,
    name: opts.name ?? `Game ${opts.id}`,
    description: null,
    sourceName: null,
    sourceDescription: null,
    creator: {
      id: opts.creator.id,
      name: opts.creator.name,
      type: opts.creator.type ?? "User",
      isRNVAccount: false,
      hasVerifiedBadge: false,
    },
    price: null,
    allowedGearGenres: [],
    allowedGearCategories: [],
    isGenreEnforced: false,
    copyingAllowed: false,
    playing: opts.playing,
    visits: opts.playing * 1_000,
    maxPlayers: 50,
    created: "2024-01-01T00:00:00Z",
    updated: "2024-06-01T00:00:00Z",
    studioAccessToApisAllowed: false,
    createVipServersAllowed: false,
    universeAvatarType: "PlayerChoice",
    genre: "Simulator",
    genre_l1: "Simulator",
    genre_l2: "Simulator",
    isAllGenre: false,
    isFavoritedByUser: false,
    favoritedCount: 0,
  };
}

function makeStubClient(games: Game[]): RobloxClient {
  return {
    getGames: vi.fn(async (_ids: number[]) => games),
  } as unknown as RobloxClient;
}

describe("getTopCreatorsByGenre", () => {
  it("aggregates CCU per creator across the seed list and ranks descending", async () => {
    const games = [
      makeGame({ id: 1, playing: 500, creator: { id: 100, name: "Alice" } }),
      makeGame({ id: 2, playing: 800, creator: { id: 100, name: "Alice" } }),
      makeGame({ id: 3, playing: 1_000, creator: { id: 200, name: "Bob" } }),
      makeGame({ id: 4, playing: 50, creator: { id: 300, name: "Carol" } }),
    ];
    const client = makeStubClient(games);

    const result = await getTopCreatorsByGenre(client, "simulator", { limit: 10 });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      creatorId: 100,
      creatorName: "Alice",
      totalPlayingAcrossSeedGames: 1_300,
      gameCount: 2,
      topGame: { universeId: 2, playing: 800 },
    });
    expect(result[1]).toMatchObject({
      creatorId: 200,
      totalPlayingAcrossSeedGames: 1_000,
      gameCount: 1,
    });
    expect(result[2]).toMatchObject({ creatorId: 300, totalPlayingAcrossSeedGames: 50 });
  });

  it("respects the limit option", async () => {
    const games = [
      makeGame({ id: 1, playing: 100, creator: { id: 1, name: "A" } }),
      makeGame({ id: 2, playing: 200, creator: { id: 2, name: "B" } }),
      makeGame({ id: 3, playing: 300, creator: { id: 3, name: "C" } }),
    ];
    const result = await getTopCreatorsByGenre(makeStubClient(games), "simulator", { limit: 2 });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.creatorId)).toEqual([3, 2]);
  });

  it("is case-insensitive on the genre key", async () => {
    const games = [makeGame({ id: 1, playing: 1, creator: { id: 1, name: "A" } })];
    const result = await getTopCreatorsByGenre(makeStubClient(games), "SIMULATOR");
    expect(result).toHaveLength(1);
  });

  it("throws VALIDATION_ERROR for unknown genres and lists supported ones", async () => {
    const client = makeStubClient([]);
    await expect(getTopCreatorsByGenre(client, "metaverse-xtreme")).rejects.toThrow(BloxscoutError);
    try {
      await getTopCreatorsByGenre(client, "metaverse-xtreme");
    } catch (err) {
      expect((err as BloxscoutError).code).toBe("VALIDATION_ERROR");
      expect((err as BloxscoutError).message).toContain("simulator");
    }
  });

  it("rejects empty genre and bad limit", async () => {
    const client = makeStubClient([]);
    await expect(getTopCreatorsByGenre(client, "")).rejects.toThrow(BloxscoutError);
    await expect(getTopCreatorsByGenre(client, "simulator", { limit: 0 })).rejects.toThrow(
      BloxscoutError,
    );
    await expect(getTopCreatorsByGenre(client, "simulator", { limit: 1.5 })).rejects.toThrow(
      BloxscoutError,
    );
  });

  it("handles an empty getGames response (no creators)", async () => {
    const result = await getTopCreatorsByGenre(makeStubClient([]), "simulator");
    expect(result).toEqual([]);
  });

  it("preserves the highest-CCU game as topGame when ties exist", async () => {
    const games = [
      makeGame({ id: 1, playing: 50, creator: { id: 1, name: "A" } }),
      makeGame({ id: 2, playing: 100, creator: { id: 1, name: "A" } }),
      makeGame({ id: 3, playing: 75, creator: { id: 1, name: "A" } }),
    ];
    const result = await getTopCreatorsByGenre(makeStubClient(games), "simulator");
    expect(result[0]?.topGame.universeId).toBe(2);
    expect(result[0]?.topGame.playing).toBe(100);
    expect(result[0]?.gameCount).toBe(3);
  });
});
