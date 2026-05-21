import { describe, expect, it } from "vitest";
import { generateMarketReport } from "../../../src/mcp/tools/generate_market_report.js";
import { BloxscoutError } from "../../../src/shared/errors.js";
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

describe("generate_market_report tool", () => {
  it("calls get_top_by_genre and assembles a report with top games + aggregates", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 100),
      summaryFixture(2, 200),
      summaryFixture(3, 300),
    ]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 100, visits: 1_000, favoritedCount: 50 }),
      gameFixture(2, { playing: 200, visits: 2_000, favoritedCount: 80 }),
      gameFixture(3, { playing: 300, visits: 3_000, favoritedCount: 120 }),
    ]);

    const out = await generateMarketReport.handler({ genre: "simulator", limit: 10 }, ctx);

    expect(out.genre).toBe("simulator");
    expect(out.generatedAt).toBeTypeOf("string");
    expect(out.structured.topGames).toHaveLength(3);
    expect(out.structured.aggregates.gameCount).toBe(3);
    expect(out.structured.aggregates.totalCcu).toBe(600);
    expect(out.structured.aggregates.medianCcu).toBe(200);
    expect(out.structured.aggregates.totalVisits).toBe(6_000);
    expect(out.structured.aggregates.totalFavorites).toBe(250);
  });

  it("includes a focusComparison section when focusUniverseId is set", async () => {
    const { ctx, client } = makeCtx();
    // searchGames is called twice: once by get_top_by_genre, once by
    // analyze_game_vs_genre. Both want the same cohort (excluding the focus).
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 100),
      summaryFixture(2, 200),
      summaryFixture(3, 300),
    ]);
    // get_top_by_genre's getGames, then analyze's target fetch, then cohort fetch.
    client.getGames
      .mockResolvedValueOnce([
        gameFixture(1, { playing: 100 }),
        gameFixture(2, { playing: 200 }),
        gameFixture(3, { playing: 300 }),
      ])
      .mockResolvedValueOnce([
        gameFixture(2, {
          playing: 200,
          visits: 2_000,
          favoritedCount: 80,
          genre_l1: "Simulator",
        }),
      ])
      .mockResolvedValueOnce([
        gameFixture(1, { playing: 100, visits: 1_000, favoritedCount: 50 }),
        gameFixture(3, { playing: 300, visits: 3_000, favoritedCount: 120 }),
      ]);

    const out = await generateMarketReport.handler(
      { genre: "simulator", focusUniverseId: 2, limit: 10 },
      ctx,
    );

    expect(out.structured.focusComparison).toBeDefined();
    expect(out.structured.focusComparison?.universeId).toBe(2);
    expect(out.structured.focusComparison?.cohortSize).toBeGreaterThan(0);
    expect(out.markdown).toContain("## Focus game vs genre");
  });

  it("markdown contains the expected H2 section headers", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([summaryFixture(1, 100), summaryFixture(2, 200)]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 100 }),
      gameFixture(2, { playing: 200 }),
    ]);

    const out = await generateMarketReport.handler({ genre: "simulator", limit: 5 }, ctx);
    expect(out.markdown).toContain("# Market report: simulator");
    expect(out.markdown).toContain("## Top games");
    expect(out.markdown).toContain("## Aggregate stats");
    expect(out.markdown).toContain("## Notable creators");
    // No focus section without focusUniverseId.
    expect(out.markdown).not.toContain("## Focus game vs genre");
  });

  it("structured.aggregates totals match what the markdown displays", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([summaryFixture(1, 1_234), summaryFixture(2, 5_678)]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 1_234, visits: 10_000, favoritedCount: 500 }),
      gameFixture(2, { playing: 5_678, visits: 20_000, favoritedCount: 700 }),
    ]);

    const out = await generateMarketReport.handler({ genre: "simulator", limit: 5 }, ctx);
    expect(out.structured.aggregates.totalCcu).toBe(6_912);
    // The markdown should embed the same total with a thousands separator.
    expect(out.markdown).toContain("6,912");
    expect(out.markdown).toContain("30,000"); // total visits
  });

  it("identifies the top creator across the top games", async () => {
    const { ctx, client } = makeCtx();
    const sharedCreator = {
      creator: {
        id: 42,
        name: "BigStudio",
        type: "Group" as const,
        isRNVAccount: false,
        hasVerifiedBadge: false,
      },
    };
    const g1 = { ...gameFixture(1, { playing: 500 }), ...sharedCreator };
    const g2 = { ...gameFixture(2, { playing: 300 }), ...sharedCreator };
    const g3 = gameFixture(3, { playing: 100 }); // default creator id 1
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 500),
      summaryFixture(2, 300),
      summaryFixture(3, 100),
    ]);
    client.getGames.mockResolvedValue([g1, g2, g3]);

    const out = await generateMarketReport.handler({ genre: "simulator", limit: 10 }, ctx);
    expect(out.structured.aggregates.topCreator?.creatorId).toBe(42);
    expect(out.structured.aggregates.topCreator?.totalPlaying).toBe(800);
    expect(out.structured.aggregates.topCreator?.gameCount).toBe(2);
  });

  it("surfaces upstream errors cleanly (unknown genre)", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([]);
    client.getGames.mockResolvedValue([]);
    await expect(
      generateMarketReport.handler({ genre: "definitely-not-a-real-genre", limit: 5 }, ctx),
    ).rejects.toBeInstanceOf(BloxscoutError);
  });

  it("respects the `limit` parameter", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 100),
      summaryFixture(2, 200),
      summaryFixture(3, 300),
      summaryFixture(4, 400),
      summaryFixture(5, 500),
    ]);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 100 }),
      gameFixture(2, { playing: 200 }),
      gameFixture(3, { playing: 300 }),
      gameFixture(4, { playing: 400 }),
      gameFixture(5, { playing: 500 }),
    ]);
    const out = await generateMarketReport.handler({ genre: "simulator", limit: 3 }, ctx);
    expect(out.structured.topGames).toHaveLength(3);
    // Top 3 by playing: ids 5, 4, 3
    expect(out.structured.topGames.map((g) => g.id)).toEqual([5, 4, 3]);
  });
});
