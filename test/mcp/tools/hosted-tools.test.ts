/**
 * Hosted-data behavior of the discovery/time-series tools: hosted view as
 * the primary path, live/local as fallback, and the two new hosted-only
 * tools (`get_breakout_games`, `get_genre_momentum`).
 */

import { describe, expect, it, vi } from "vitest";
import { getTrendingGames } from "../../../src/mcp/tools/get-trending-games.js";
import { getBreakoutGames } from "../../../src/mcp/tools/get_breakout_games.js";
import { getGameHistory } from "../../../src/mcp/tools/get_game_history.js";
import { getGenreMomentum } from "../../../src/mcp/tools/get_genre_momentum.js";
import { getUpAndComing } from "../../../src/mcp/tools/get_up_and_coming.js";
import { gameFixture, makeCtx } from "./_helpers.js";

const GENERATED_AT = "2026-06-12T12:00:00.000Z";

function viewEntry(
  universeId: number,
  overrides: Partial<{
    name: string;
    genre: string | null;
    playing: number;
    growth24hPct: number | null;
    growth7dPct: number | null;
    zScore24h: number | null;
  }> = {},
) {
  return {
    universeId,
    name: overrides.name ?? `Game ${universeId}`,
    genre: overrides.genre ?? null,
    playing: overrides.playing ?? 1000,
    avg24h: 900,
    peak24h: 1200,
    growth24hPct: overrides.growth24hPct ?? 0.5,
    growth7dPct: overrides.growth7dPct ?? 1.0,
    zScore24h: overrides.zScore24h ?? null,
    visitsDelta24h: 10_000,
  };
}

function rankedView(entries: ReturnType<typeof viewEntry>[]) {
  return { schemaVersion: 1, generatedAt: GENERATED_AT, entries };
}

describe("get_trending_games (hosted)", () => {
  it("serves the hosted trending view enriched with full game metadata", async () => {
    const { ctx, client } = makeCtx(
      {},
      {
        hosted: {
          getTrendingView: vi
            .fn()
            .mockResolvedValue(
              rankedView([
                viewEntry(2, { growth24hPct: 2.0 }),
                viewEntry(1, { growth24hPct: 0.3 }),
              ]),
            ),
        },
      },
    );
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 50 }),
      gameFixture(2, { playing: 900 }),
    ]);

    const input = getTrendingGames.inputSchema.parse({ limit: 5 });
    const out = await getTrendingGames.handler(input, ctx);

    expect(out.source).toBe("hosted");
    expect(out.dataGeneratedAt).toBe(GENERATED_AT);
    // View order preserved, growth fields merged onto full Game objects.
    expect(out.games.map((g) => g.id)).toEqual([2, 1]);
    expect(out.games[0]?.growth24hPct).toBe(2.0);
    expect(client.searchGames).not.toHaveBeenCalled();
  });

  it("filters hosted entries by genre using the genre_l1 mapping", async () => {
    const { ctx, client } = makeCtx(
      {},
      {
        hosted: {
          getTrendingView: vi
            .fn()
            .mockResolvedValue(
              rankedView([
                viewEntry(1, { genre: "Simulation" }),
                viewEntry(2, { genre: "Horror" }),
              ]),
            ),
        },
      },
    );
    client.getGames.mockResolvedValue([gameFixture(1)]);

    const input = getTrendingGames.inputSchema.parse({ genre: "simulator", limit: 5 });
    const out = await getTrendingGames.handler(input, ctx);
    expect(out.games.map((g) => g.id)).toEqual([1]);
    expect(out.source).toBe("hosted");
  });

  it("falls back to the live omni-search path when hosted data is unavailable", async () => {
    const { ctx, client } = makeCtx(
      {},
      { hosted: { getTrendingView: vi.fn().mockResolvedValue(null) } },
    );
    client.searchGames.mockResolvedValue([]);
    client.getGames.mockResolvedValue([]);

    const input = getTrendingGames.inputSchema.parse({ limit: 5 });
    const out = await getTrendingGames.handler(input, ctx);
    expect(out.source).toBe("live");
    expect(client.searchGames).toHaveBeenCalled();
  });

  it("falls back to live search when the genre filter matches nothing hosted", async () => {
    const { ctx, client } = makeCtx(
      {},
      {
        hosted: {
          getTrendingView: vi
            .fn()
            .mockResolvedValue(rankedView([viewEntry(1, { genre: "Horror" })])),
        },
      },
    );
    client.searchGames.mockResolvedValue([]);
    client.getGames.mockResolvedValue([]);

    const input = getTrendingGames.inputSchema.parse({ genre: "tower defense", limit: 5 });
    const out = await getTrendingGames.handler(input, ctx);
    expect(out.source).toBe("live");
  });
});

describe("get_game_history (hosted merge)", () => {
  const hostedHistory = {
    hourly: [
      [Date.parse("2026-06-12T10:00:00Z"), 100, 120, 5000, 50],
      [Date.parse("2026-06-12T11:00:00Z"), 110, 130, 5100, 51],
    ],
    daily: [["2026-06-10", 90, 100, 4000, 45]],
  };

  it("returns hosted history when the local store is empty", async () => {
    const { ctx } = makeCtx(
      {},
      {
        hosted: { getGameHistory: vi.fn().mockResolvedValue(hostedHistory) },
        store: { getGameHistory: vi.fn().mockReturnValue([]) },
      },
    );
    const input = getGameHistory.inputSchema.parse({ universeId: 42 });
    const out = await getGameHistory.handler(input, ctx);

    expect(out.snapshots).toHaveLength(3);
    // Newest first.
    expect(out.snapshots[0]?.takenAt).toBe("2026-06-12T11:00:00.000Z");
    expect(out.snapshots[0]?.source).toBe("hosted-hourly");
    expect(out.snapshots[2]?.source).toBe("hosted-daily");
    expect(out.coverage).toEqual({ local: 0, hostedHourly: 2, hostedDaily: 1 });
  });

  it("prefers local snapshots over hosted points in the same hour", async () => {
    const localRow = {
      universeId: 42,
      takenAt: "2026-06-12T11:20:00.000Z",
      playing: 115,
      visits: 5150,
      favoritedCount: 52,
      totalUpVotes: 10,
      totalDownVotes: 1,
    };
    const { ctx } = makeCtx(
      {},
      {
        hosted: { getGameHistory: vi.fn().mockResolvedValue(hostedHistory) },
        store: { getGameHistory: vi.fn().mockReturnValue([localRow]) },
      },
    );
    const input = getGameHistory.inputSchema.parse({ universeId: 42 });
    const out = await getGameHistory.handler(input, ctx);

    // The 11:00 hosted hourly point is shadowed by the 11:20 local snapshot.
    const elevenOClock = out.snapshots.filter((s) => s.takenAt.startsWith("2026-06-12T11"));
    expect(elevenOClock).toHaveLength(1);
    expect(elevenOClock[0]?.source).toBe("local");
    expect(out.coverage?.local).toBe(1);
  });

  it("still works local-only when hosted is unavailable", async () => {
    const { ctx } = makeCtx(
      {},
      {
        hosted: { getGameHistory: vi.fn().mockResolvedValue(null) },
        store: {
          getGameHistory: vi.fn().mockReturnValue([
            {
              universeId: 42,
              takenAt: "2026-06-12T11:20:00.000Z",
              playing: 1,
              visits: 2,
              favoritedCount: 3,
              totalUpVotes: 0,
              totalDownVotes: 0,
            },
          ]),
        },
      },
    );
    const input = getGameHistory.inputSchema.parse({ universeId: 42 });
    const out = await getGameHistory.handler(input, ctx);
    expect(out.snapshots).toHaveLength(1);
    expect(out.snapshots[0]?.source).toBe("local");
  });
});

describe("get_up_and_coming (hosted)", () => {
  it("serves the hosted view for default inputs", async () => {
    const { ctx } = makeCtx(
      {},
      {
        hosted: {
          getUpAndComingView: vi
            .fn()
            .mockResolvedValue(rankedView([viewEntry(7, { playing: 800, growth24hPct: 3.0 })])),
        },
      },
    );
    const input = getUpAndComing.inputSchema.parse({});
    const out = await getUpAndComing.handler(input, ctx);
    expect(out.source).toBe("hosted");
    expect(out.entries[0]).toMatchObject({ universeId: 7, currentPlaying: 800, deltaPct: 3.0 });
  });

  it("uses the local store when custom window/baseline inputs are given", async () => {
    const hostedView = vi.fn();
    const { ctx } = makeCtx(
      {},
      {
        hosted: { getUpAndComingView: hostedView },
        store: {
          getGameHistory: vi.fn().mockReturnValue([]),
          getTrackedUniverseIds: vi.fn().mockReturnValue([]),
          getMetadata: vi.fn(),
        },
      },
    );
    const input = getUpAndComing.inputSchema.parse({ minBaselinePlayers: 100 });
    const out = await getUpAndComing.handler(input, ctx);
    expect(hostedView).not.toHaveBeenCalled();
    expect(out.source).toBe("local");
  });
});

describe("get_breakout_games", () => {
  it("returns hosted breakout entries trimmed to limit", async () => {
    const { ctx } = makeCtx(
      {},
      {
        hosted: {
          getBreakoutsView: vi
            .fn()
            .mockResolvedValue(
              rankedView([
                viewEntry(1, { zScore24h: 9 }),
                viewEntry(2, { zScore24h: 5 }),
                viewEntry(3, { zScore24h: 3 }),
              ]),
            ),
        },
      },
    );
    const input = getBreakoutGames.inputSchema.parse({ limit: 2 });
    const out = await getBreakoutGames.handler(input, ctx);
    expect(out.entries).toHaveLength(2);
    expect(out.entries[0]?.zScore24h).toBe(9);
    expect(out.generatedAt).toBe(GENERATED_AT);
  });

  it("throws a clear error when hosted data is unavailable", async () => {
    const { ctx } = makeCtx({}, { hosted: { getBreakoutsView: vi.fn().mockResolvedValue(null) } });
    const input = getBreakoutGames.inputSchema.parse({});
    await expect(getBreakoutGames.handler(input, ctx)).rejects.toThrow(/hosted/i);
  });
});

describe("get_genre_momentum", () => {
  it("returns hosted genre aggregates", async () => {
    const { ctx } = makeCtx(
      {},
      {
        hosted: {
          getGenresView: vi.fn().mockResolvedValue({
            schemaVersion: 1,
            generatedAt: GENERATED_AT,
            genres: [
              {
                genre: "Simulation",
                gameCount: 50,
                totalPlaying: 500_000,
                growth24hPct: 0.1,
                growth7dPct: 0.4,
                topGames: [{ universeId: 1, name: "G", playing: 100_000 }],
              },
            ],
          }),
        },
      },
    );
    const input = getGenreMomentum.inputSchema.parse({});
    const out = await getGenreMomentum.handler(input, ctx);
    expect(out.genres[0]?.genre).toBe("Simulation");
    expect(out.genres[0]?.growth7dPct).toBe(0.4);
  });

  it("throws a clear error when hosted data is unavailable", async () => {
    const { ctx } = makeCtx({}, { hosted: { getGenresView: vi.fn().mockResolvedValue(null) } });
    const input = getGenreMomentum.inputSchema.parse({});
    await expect(getGenreMomentum.handler(input, ctx)).rejects.toThrow(/hosted/i);
  });
});
