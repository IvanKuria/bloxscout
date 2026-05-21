import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeGrowthSeries,
  computeTrending,
  computeUpAndComing,
} from "../../src/core/rankings.js";
import { SnapshotStore } from "../../src/core/snapshots.js";
import type { Game } from "../../src/core/types.js";

// biome-ignore lint/suspicious/noExplicitAny: fixture helper.
type AnyGame = any;

function makeGame(id: number, playing: number, name = `G${id}`): Game {
  const g: AnyGame = {
    id,
    rootPlaceId: id * 10,
    name,
    description: null,
    sourceName: null,
    sourceDescription: null,
    creator: { id: 1, name: "c", type: "User", isRNVAccount: false, hasVerifiedBadge: false },
    price: null,
    allowedGearGenres: [],
    allowedGearCategories: [],
    isGenreEnforced: true,
    copyingAllowed: false,
    playing,
    visits: playing * 10,
    maxPlayers: 50,
    created: "2024-01-01T00:00:00Z",
    updated: "2024-01-01T00:00:00Z",
    studioAccessToApisAllowed: false,
    createVipServersAllowed: false,
    universeAvatarType: "MorphToR15",
    genre: "Adventure",
    genre_l1: "Adventure",
    genre_l2: "Open",
    isAllGenre: false,
    isFavoritedByUser: false,
    favoritedCount: playing,
  };
  return g;
}

describe("rankings", () => {
  let dir: string;
  let store: SnapshotStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bloxscout-rank-"));
    store = new SnapshotStore({ dbPath: join(dir, "test.db") });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // Helper: record N snapshots for a game, spacing them ~5ms apart, walking
  // `playing` from `from` to `to` linearly. Returns the final entry.
  async function seed(id: number, values: number[]): Promise<void> {
    for (const v of values) {
      store.recordSnapshot([makeGame(id, v)]);
      await new Promise((r) => setTimeout(r, 3));
    }
  }

  describe("computeTrending", () => {
    it("returns [] when no games are tracked", () => {
      expect(computeTrending(store)).toEqual([]);
    });

    it("skips games with fewer than 2 snapshots", async () => {
      await seed(1, [100]);
      expect(computeTrending(store)).toEqual([]);
    });

    it("ranks by growth rate descending", async () => {
      await seed(1, [100, 200]); // +1.0
      await seed(2, [100, 150]); // +0.5
      await seed(3, [100, 400]); // +3.0

      const ranked = computeTrending(store);
      expect(ranked.map((r) => r.universeId)).toEqual([3, 1, 2]);
      expect(ranked[0]?.deltaPct).toBeCloseTo(3, 5);
      expect(ranked[1]?.deltaPct).toBeCloseTo(1, 5);
      expect(ranked[2]?.deltaPct).toBeCloseTo(0.5, 5);
    });

    it("handles identical player counts as 0% delta", async () => {
      await seed(1, [100, 100, 100]);
      const ranked = computeTrending(store);
      expect(ranked).toHaveLength(1);
      expect(ranked[0]?.deltaPct).toBe(0);
    });

    it("returns 0 delta when baseline and latest are both zero", async () => {
      await seed(1, [0, 0]);
      const ranked = computeTrending(store);
      expect(ranked[0]?.deltaPct).toBe(0);
    });

    it("returns Infinity when baseline is 0 and latest is positive", async () => {
      await seed(1, [0, 50]);
      const ranked = computeTrending(store);
      expect(ranked[0]?.deltaPct).toBe(Number.POSITIVE_INFINITY);
    });

    it("respects the limit option", async () => {
      for (let i = 1; i <= 5; i++) {
        await seed(i, [10, 10 + i]);
      }
      const ranked = computeTrending(store, { limit: 2 });
      expect(ranked).toHaveLength(2);
    });

    it("populates name from metadata", async () => {
      store.recordSnapshot([makeGame(1, 100, "Cool Game")]);
      await new Promise((r) => setTimeout(r, 5));
      store.recordSnapshot([makeGame(1, 200, "Cool Game")]);
      const ranked = computeTrending(store);
      expect(ranked[0]?.name).toBe("Cool Game");
    });
  });

  describe("computeUpAndComing", () => {
    it("filters out games whose baseline is above the ceiling", async () => {
      await seed(1, [100, 500]); // baseline 100 - small, should appear
      await seed(2, [10_000, 50_000]); // baseline 10k - filtered out
      const ranked = computeUpAndComing(store, { minBaselinePlayers: 5_000 });
      expect(ranked.map((r) => r.universeId)).toEqual([1]);
    });

    it("uses a 5,000-player default baseline ceiling", async () => {
      await seed(1, [100, 500]);
      await seed(2, [6_000, 12_000]);
      const ranked = computeUpAndComing(store);
      expect(ranked.map((r) => r.universeId)).toEqual([1]);
    });
  });

  describe("computeGrowthSeries", () => {
    it("returns [] when there is no history", () => {
      expect(computeGrowthSeries(store, 1)).toEqual([]);
    });

    it("aggregates snapshots into buckets with avg and max", async () => {
      // Two snapshots in quick succession will land in the same bucket.
      store.recordSnapshot([makeGame(1, 100)]);
      await new Promise((r) => setTimeout(r, 5));
      store.recordSnapshot([makeGame(1, 200)]);

      const series = computeGrowthSeries(store, 1, { window: "24h" });
      expect(series.length).toBeGreaterThan(0);
      const total = series.reduce((s, b) => s + b.avgPlaying * 1, 0);
      const maxes = series.map((b) => b.maxPlaying);
      // The latest playing value (200) must show up as a max somewhere.
      expect(maxes).toContain(200);
      expect(total).toBeGreaterThan(0);
    });
  });
});
