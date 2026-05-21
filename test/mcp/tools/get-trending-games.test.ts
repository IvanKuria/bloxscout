import { describe, expect, it } from "vitest";
import { getTrendingGames } from "../../../src/mcp/tools/get-trending-games.js";
import { gameFixture, makeCtx } from "./_helpers.js";

function summaryFixture(id: number, playerCount: number) {
  return {
    universeId: id,
    rootPlaceId: id * 10,
    name: `Game ${id}`,
    description: "",
    playerCount,
    totalUpVotes: 0,
    totalDownVotes: 0,
    creatorId: 1,
    creatorName: "creator",
    creatorHasVerifiedBadge: false,
    contentId: id,
    contentType: "Game",
  };
}

describe("get_trending_games tool", () => {
  it("ranks the live candidate pool by `playing` CCU", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 10),
      summaryFixture(2, 9000),
      summaryFixture(3, 500),
    ]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 10 }),
      gameFixture(2, { playing: 9000 }),
      gameFixture(3, { playing: 500 }),
    ]);
    const input = getTrendingGames.inputSchema.parse({ limit: 2 });
    const out = await getTrendingGames.handler(input, ctx);
    expect(out.games.map((g) => g.id)).toEqual([2, 3]);
  });

  it("calls searchGames with the genre's keyword when a known genre is passed", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([summaryFixture(1, 1)]);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 1 })]);
    const input = getTrendingGames.inputSchema.parse({ genre: "simulator", limit: 5 });
    await getTrendingGames.handler(input, ctx);
    expect(client.searchGames).toHaveBeenCalled();
    const firstCallArgs = client.searchGames.mock.calls[0];
    expect(firstCallArgs?.[0]).toBe("simulator");
  });

  it("falls back to the cross-genre sweep for unknown genres", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([]);
    client.getGames.mockResolvedValue([]);
    const input = getTrendingGames.inputSchema.parse({ genre: "totally-fake", limit: 5 });
    const out = await getTrendingGames.handler(input, ctx);
    // Cross-genre sweep should issue multiple searchGames calls (one per supported genre).
    expect(client.searchGames.mock.calls.length).toBeGreaterThan(1);
    expect(out.games).toEqual([]);
  });

  it("defaults limit to 20", () => {
    const parsed = getTrendingGames.inputSchema.parse({});
    expect(parsed.limit).toBe(20);
  });
});
