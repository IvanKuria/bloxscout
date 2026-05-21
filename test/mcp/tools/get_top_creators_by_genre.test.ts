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
  return { getGames: vi.fn(async () => games) } as unknown as RobloxClient;
}

describe("get_top_creators_by_genre tool", () => {
  it("has a stable name and an LLM-ready description naming v0.1 seed limits", () => {
    expect(getTopCreatorsByGenreTool.name).toBe("get_top_creators_by_genre");
    expect(getTopCreatorsByGenreTool.description).toContain("genre");
    expect(getTopCreatorsByGenreTool.description).toContain("seed list");
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

  it("propagates validation errors for unknown genres", async () => {
    const client = stub([]);
    await expect(
      getTopCreatorsByGenreTool.handler({ genre: "not-a-genre", limit: 10 }, { client }),
    ).rejects.toThrow();
  });
});
