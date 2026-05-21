import { describe, expect, it, vi } from "vitest";
import type { RobloxClient } from "../../../src/core/roblox-client.js";
import type { Game } from "../../../src/core/types.js";
import { getTopCreatorsByGenreTool } from "../../../src/mcp/tools/get_top_creators_by_genre.js";

function makeGame(id: number, playing: number, creatorId: number, creatorName: string): Game {
  return {
    id,
    rootPlaceId: id * 10,
    name: `Game ${id}`,
    description: null,
    sourceName: null,
    sourceDescription: null,
    creator: {
      id: creatorId,
      name: creatorName,
      type: "User",
      isRNVAccount: false,
      hasVerifiedBadge: false,
    },
    price: null,
    allowedGearGenres: [],
    allowedGearCategories: [],
    isGenreEnforced: false,
    copyingAllowed: false,
    playing,
    visits: playing * 1_000,
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

function stub(games: Game[]): RobloxClient {
  const summaries = games.map((g) => ({
    universeId: g.id,
    rootPlaceId: g.rootPlaceId,
    name: g.name,
    description: g.description ?? "",
    playerCount: g.playing,
    totalUpVotes: 0,
    totalDownVotes: 0,
    creatorId: g.creator.id,
    creatorName: g.creator.name,
    creatorHasVerifiedBadge: false,
    contentId: g.id,
    contentType: "Game",
  }));
  return {
    searchGames: vi.fn(async () => summaries),
    getGames: vi.fn(async () => games),
  } as unknown as RobloxClient;
}

describe("get_top_creators_by_genre tool", () => {
  it("has a stable name and an LLM-ready description naming the omni-search source", () => {
    expect(getTopCreatorsByGenreTool.name).toBe("get_top_creators_by_genre");
    expect(getTopCreatorsByGenreTool.description).toContain("genre");
    expect(getTopCreatorsByGenreTool.description).toContain("omni-search");
    expect(getTopCreatorsByGenreTool.description).toContain("simulator");
  });

  it("exposes Zod input/output schemas", () => {
    expect(
      getTopCreatorsByGenreTool.inputSchema.safeParse({ genre: "simulator", limit: 10 }).success,
    ).toBe(true);
    expect(getTopCreatorsByGenreTool.inputSchema.safeParse({ genre: "simulator" }).success).toBe(
      true,
    );
  });

  it("returns a wrapped { genre, creators } payload", async () => {
    const client = stub([makeGame(1, 500, 100, "Alice"), makeGame(2, 200, 200, "Bob")]);
    const result = await getTopCreatorsByGenreTool.handler(
      { genre: "simulator", limit: 10 },
      { client },
    );
    expect(result.genre).toBe("simulator");
    expect(result.creators).toHaveLength(2);
    expect(result.creators[0]?.creatorName).toBe("Alice");
  });

  // v0.1.2 regression (#40): the previous allowlist gate rejected any genre
  // outside SUPPORTED_GENRES with a VALIDATION_ERROR. Roblox's omni-search
  // handles the long tail of popular genres natively, so arbitrary keywords
  // must now pass through.
  it.each(["tower-defense", "anime", "racing", "battlegrounds"])(
    "accepts arbitrary genre keyword %s without rejecting",
    async (genre) => {
      const client = stub([makeGame(1, 250, 50, "Studio")]);
      const result = await getTopCreatorsByGenreTool.handler({ genre, limit: 10 }, { client });
      expect(result.genre).toBe(genre);
      // Unaliased keyword passes through verbatim to omni-search.
      expect(client.searchGames).toHaveBeenCalledWith(genre, expect.any(Object));
      expect(result.creators).toHaveLength(1);
    },
  );

  it("preserves alias mapping for `rpg` (-> role-playing search query)", async () => {
    const client = stub([makeGame(1, 250, 50, "Studio")]);
    await getTopCreatorsByGenreTool.handler({ genre: "rpg", limit: 10 }, { client });
    expect(client.searchGames).toHaveBeenCalledWith("rpg", expect.any(Object));
  });

  it("still rejects empty-string genres with VALIDATION_ERROR", async () => {
    const client = stub([]);
    await expect(
      getTopCreatorsByGenreTool.handler({ genre: "   ", limit: 10 }, { client }),
    ).rejects.toThrow();
  });
});
