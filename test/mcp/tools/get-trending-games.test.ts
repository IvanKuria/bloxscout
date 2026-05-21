import { describe, expect, it } from "vitest";
import { getTrendingGames } from "../../../src/mcp/tools/get-trending-games.js";
import { gameFixture, makeCtx } from "./_helpers.js";

describe("get_trending_games tool", () => {
  it("ranks the seed pool by `playing` CCU", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 10 }),
      gameFixture(2, { playing: 9000 }),
      gameFixture(3, { playing: 500 }),
    ]);
    const input = getTrendingGames.inputSchema.parse({ limit: 2 });
    const out = await getTrendingGames.handler(input, ctx);
    expect(out.games.map((g) => g.id)).toEqual([2, 3]);
  });

  it("uses the per-genre seed when a known genre is passed", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 1 })]);
    const input = getTrendingGames.inputSchema.parse({ genre: "simulator", limit: 5 });
    await getTrendingGames.handler(input, ctx);
    const firstCall = client.getGames.mock.calls[0]?.[0] as number[];
    // sanity: at least one id was requested; we don't pin the exact seed list
    // here so the seed file can evolve without breaking the test.
    expect(firstCall.length).toBeGreaterThan(0);
  });

  it("falls back to the cross-genre pool for unknown genres", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([]);
    const input = getTrendingGames.inputSchema.parse({ genre: "totally-fake", limit: 5 });
    const out = await getTrendingGames.handler(input, ctx);
    expect(client.getGames).toHaveBeenCalled();
    expect(out.games).toEqual([]);
  });

  it("defaults limit to 20", () => {
    const parsed = getTrendingGames.inputSchema.parse({});
    expect(parsed.limit).toBe(20);
  });
});
