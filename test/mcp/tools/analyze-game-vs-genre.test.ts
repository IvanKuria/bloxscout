import { BloxscoutError, RobloxNotFoundError } from "@bloxscout/core/errors";
import { describe, expect, it } from "vitest";
import { analyzeGameVsGenre } from "../../../src/mcp/tools/analyze-game-vs-genre.js";
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

describe("analyze_game_vs_genre tool", () => {
  it("returns target, cohort stats, and per-metric percentiles", async () => {
    const { ctx, client } = makeCtx();
    // First getGames call: target lookup.
    // Second getGames call: cohort lookup (driven by searchGames result).
    client.getGames
      .mockResolvedValueOnce([
        gameFixture(100, {
          name: "Target",
          playing: 200,
          visits: 5_000,
          favoritedCount: 100,
          maxPlayers: 12,
          genre_l1: "Simulator",
        }),
      ])
      .mockResolvedValueOnce([
        gameFixture(1, { playing: 50, visits: 1_000, favoritedCount: 10, maxPlayers: 6 }),
        gameFixture(2, { playing: 150, visits: 3_000, favoritedCount: 50, maxPlayers: 10 }),
        gameFixture(3, { playing: 1_000, visits: 100_000, favoritedCount: 9_999, maxPlayers: 20 }),
      ]);
    client.searchGames.mockResolvedValue([
      summaryFixture(1, 50),
      summaryFixture(2, 150),
      summaryFixture(3, 1_000),
    ]);

    const out = await analyzeGameVsGenre.handler(
      { universeId: 100, genre: "simulator", cohortLimit: 20 },
      ctx,
    );

    expect(out.game.id).toBe(100);
    expect(out.genre).toBe("Simulator");
    expect(out.cohortSize).toBe(3);
    expect(out.metrics.playing.value).toBe(200);
    // Cohort = [50, 150, 1000]; median = 150
    expect(out.metrics.playing.genreMedian).toBe(150);
    expect(out.metrics.playing.genreMax).toBe(1000);
    // Target (200) sits 3rd out of 4 in the combined sorted set -> 75%
    expect(out.metrics.playing.percentile).toBeGreaterThan(50);
    expect(out.metrics.playing.percentile).toBeLessThanOrEqual(100);
  });

  it("uses the target's genre_l1 when no genre is provided", async () => {
    const { ctx, client } = makeCtx();
    client.getGames
      .mockResolvedValueOnce([gameFixture(100, { genre_l1: "Simulator", playing: 1 })])
      .mockResolvedValueOnce([gameFixture(1, { playing: 1 })]);
    client.searchGames.mockResolvedValue([summaryFixture(1, 1)]);

    const out = await analyzeGameVsGenre.handler({ universeId: 100, cohortLimit: 20 }, ctx);
    expect(out.genre).toBe("Simulator");
  });

  it("throws RobloxNotFoundError when the target universe is missing", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValueOnce([]);
    await expect(
      analyzeGameVsGenre.handler({ universeId: 999, cohortLimit: 20 }, ctx),
    ).rejects.toBeInstanceOf(RobloxNotFoundError);
  });

  it("throws VALIDATION_ERROR when the target's genre has no curated cohort", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValueOnce([gameFixture(100, { genre_l1: "MadeUpGenreXYZ" })]);
    await expect(
      analyzeGameVsGenre.handler({ universeId: 100, cohortLimit: 20 }, ctx),
    ).rejects.toBeInstanceOf(BloxscoutError);
  });
});
