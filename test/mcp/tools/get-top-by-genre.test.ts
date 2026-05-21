import { describe, expect, it } from "vitest";
import { getTopByGenre } from "../../../src/mcp/tools/get-top-by-genre.js";
import { gameFixture, makeCtx } from "./_helpers.js";

/** Build a GameSummary stand-in for `searchGames` mocks. */
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

describe("get_top_by_genre tool", () => {
  it("ranks by `playing` by default and trims to limit", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 50),
      summaryFixture(2, 500),
      summaryFixture(3, 100),
    ]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 50 }),
      gameFixture(2, { playing: 500 }),
      gameFixture(3, { playing: 100 }),
    ]);
    const input = getTopByGenre.inputSchema.parse({ genre: "simulator", limit: 2 });
    const out = await getTopByGenre.handler(input, ctx);
    expect(out.games.map((g) => g.id)).toEqual([2, 3]);
  });

  it("ranks by `visits` when requested", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([summaryFixture(1, 1), summaryFixture(2, 1)]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { visits: 10 }),
      gameFixture(2, { visits: 50 }),
    ]);
    const input = getTopByGenre.inputSchema.parse({
      genre: "simulator",
      rankBy: "visits",
      limit: 5,
    });
    const out = await getTopByGenre.handler(input, ctx);
    expect(out.games[0]?.id).toBe(2);
  });

  it("resolves alias `rpg` to the canonical role-playing search query", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([summaryFixture(1, 1)]);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 1 })]);
    const input = getTopByGenre.inputSchema.parse({ genre: "rpg" });
    await getTopByGenre.handler(input, ctx);
    // `rpg` alias must map to the canonical role-playing entry's searchQuery
    // ("rpg") so omni-search returns the curated query rather than the raw
    // user input — preserved across the v0.1.2 allowlist removal (#40).
    expect(client.searchGames).toHaveBeenCalledWith("rpg", expect.any(Object));
    expect(client.getGames).toHaveBeenCalled();
  });

  // v0.1.2 regression (#40): the old behaviour rejected any genre not in
  // SUPPORTED_GENRES with a VALIDATION_ERROR. Real Roblox has a long tail of
  // popular genres (tower-defense, anime, racing, tycoon, battlegrounds, ...)
  // that the curated list never covered, so the rejection was an adoption
  // blocker. Arbitrary keywords must now pass through to omni-search.
  it.each(["tower-defense", "anime", "racing", "battlegrounds", "bogus-genre-zzz"])(
    "passes arbitrary keyword %s through to omni-search (no allowlist rejection)",
    async (genre) => {
      const { ctx, client } = makeCtx();
      client.searchGames.mockResolvedValue([summaryFixture(1, 999)]);
      client.getGames.mockResolvedValue([gameFixture(1, { playing: 999 })]);
      const input = getTopByGenre.inputSchema.parse({ genre });
      await expect(getTopByGenre.handler(input, ctx)).resolves.toBeDefined();
      // Unaliased keyword passes through verbatim (after lower/hyphen norm).
      expect(client.searchGames).toHaveBeenCalledWith(genre, expect.any(Object));
    },
  );

  it("preserves alias mapping for `tycoon` (-> simulator search query)", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([summaryFixture(1, 1)]);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 1 })]);
    const input = getTopByGenre.inputSchema.parse({ genre: "tycoon" });
    await getTopByGenre.handler(input, ctx);
    expect(client.searchGames).toHaveBeenCalledWith("simulator", expect.any(Object));
  });

  it("returns an empty list when omni-search returns nothing", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([]);
    const input = getTopByGenre.inputSchema.parse({ genre: "simulator" });
    const out = await getTopByGenre.handler(input, ctx);
    expect(out.games).toEqual([]);
    expect(client.getGames).not.toHaveBeenCalled();
  });
});
