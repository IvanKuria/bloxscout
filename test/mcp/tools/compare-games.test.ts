import { describe, expect, it } from "vitest";
import { compareGames } from "../../../src/mcp/tools/compare-games.js";
import { gameFixture, makeCtx } from "./_helpers.js";

describe("compare_games tool", () => {
  it("returns games + min/max/median + missing ids", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 100, visits: 1000, favoritedCount: 10 }),
      gameFixture(2, { playing: 200, visits: 2000, favoritedCount: 20 }),
      gameFixture(3, { playing: 300, visits: 3000, favoritedCount: 30 }),
    ]);
    const out = await compareGames.handler({ universeIds: [1, 2, 3, 999] }, ctx);
    expect(out.games).toHaveLength(3);
    expect(out.metrics.playing).toEqual({ min: 100, max: 300, median: 200 });
    expect(out.metrics.visits).toEqual({ min: 1000, max: 3000, median: 2000 });
    expect(out.metrics.favoritedCount).toEqual({ min: 10, max: 30, median: 20 });
    expect(out.missingUniverseIds).toEqual([999]);
  });

  it("computes median across an even-sized set", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 10 }),
      gameFixture(2, { playing: 20 }),
      gameFixture(3, { playing: 30 }),
      gameFixture(4, { playing: 40 }),
    ]);
    const out = await compareGames.handler({ universeIds: [1, 2, 3, 4] }, ctx);
    expect(out.metrics.playing.median).toBe(25);
  });

  it("rejects fewer than 2 ids", () => {
    expect(() => compareGames.inputSchema.parse({ universeIds: [1] })).toThrow();
  });

  it("rejects more than 10 ids", () => {
    expect(() =>
      compareGames.inputSchema.parse({ universeIds: Array.from({ length: 11 }, (_, i) => i + 1) }),
    ).toThrow();
  });
});
