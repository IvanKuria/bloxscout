import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SnapshotStore } from "../../src/core/snapshots.js";
import type { Game } from "../../src/core/types.js";

// biome-ignore lint/suspicious/noExplicitAny: test fixtures intentionally loose.
type AnyGame = any;

function makeGame(overrides: Partial<Game> & { id: number }): Game {
  const base: AnyGame = {
    id: overrides.id,
    rootPlaceId: overrides.id * 10,
    name: `Game ${overrides.id}`,
    description: null,
    sourceName: null,
    sourceDescription: null,
    creator: {
      id: 1000 + overrides.id,
      name: `Creator ${overrides.id}`,
      type: "User",
      isRNVAccount: false,
      hasVerifiedBadge: false,
    },
    price: null,
    allowedGearGenres: [],
    allowedGearCategories: [],
    isGenreEnforced: true,
    copyingAllowed: false,
    playing: 100,
    visits: 1_000,
    maxPlayers: 50,
    created: "2024-01-01T00:00:00Z",
    updated: "2024-06-01T00:00:00Z",
    studioAccessToApisAllowed: false,
    createVipServersAllowed: false,
    universeAvatarType: "MorphToR15",
    genre: "Adventure",
    genre_l1: "Adventure",
    genre_l2: "Open World",
    isAllGenre: false,
    isFavoritedByUser: false,
    favoritedCount: 500,
  };
  return { ...base, ...overrides };
}

describe("SnapshotStore", () => {
  let dir: string;
  let store: SnapshotStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bloxscout-snap-"));
    store = new SnapshotStore({ dbPath: join(dir, "test.db") });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the schema on first open", () => {
    // A working query proves the tables exist.
    const history = store.getGameHistory(123);
    expect(history).toEqual([]);
  });

  it("creates the parent directory if missing", () => {
    const nested = join(dir, "nested", "sub", "db.sqlite");
    const s = new SnapshotStore({ dbPath: nested });
    expect(s.getTrackedUniverseIds()).toEqual([]);
    s.close();
  });

  it("records a snapshot for each game in a batch", () => {
    const result = store.recordSnapshot([
      makeGame({ id: 1, playing: 50 }),
      makeGame({ id: 2, playing: 200 }),
    ]);
    expect(result.recorded).toBe(2);
    expect(typeof result.takenAt).toBe("string");
    expect(store.getTrackedUniverseIds()).toEqual([1, 2]);
  });

  it("returns {recorded:0} for an empty batch without writing", () => {
    const result = store.recordSnapshot([]);
    expect(result.recorded).toBe(0);
    expect(store.getTrackedUniverseIds()).toEqual([]);
  });

  it("upserts metadata: latest name/genre/creator wins, first_seen is preserved", async () => {
    store.recordSnapshot([makeGame({ id: 7, name: "Old Name", genre: "RPG" })]);
    const firstMeta = store.getMetadata(7);
    expect(firstMeta?.name).toBe("Old Name");
    expect(firstMeta?.firstSeen).toBeDefined();

    // Sleep 5ms so the second timestamp is strictly later.
    await new Promise((r) => setTimeout(r, 5));
    store.recordSnapshot([makeGame({ id: 7, name: "New Name", genre: "Adventure" })]);
    const secondMeta = store.getMetadata(7);
    expect(secondMeta?.name).toBe("New Name");
    expect(secondMeta?.genre).toBe("Adventure");
    expect(secondMeta?.firstSeen).toBe(firstMeta?.firstSeen);
    expect(secondMeta?.lastSeen).not.toBe(firstMeta?.lastSeen);
  });

  it("getGameHistory returns rows newest-first", async () => {
    store.recordSnapshot([makeGame({ id: 1, playing: 10 })]);
    await new Promise((r) => setTimeout(r, 5));
    store.recordSnapshot([makeGame({ id: 1, playing: 20 })]);
    await new Promise((r) => setTimeout(r, 5));
    store.recordSnapshot([makeGame({ id: 1, playing: 30 })]);

    const history = store.getGameHistory(1);
    expect(history).toHaveLength(3);
    expect(history.map((h) => h.playing)).toEqual([30, 20, 10]);
  });

  it("getGameHistory respects the `since` filter", async () => {
    store.recordSnapshot([makeGame({ id: 1, playing: 10 })]);
    await new Promise((r) => setTimeout(r, 5));
    const cutoff = new Date();
    await new Promise((r) => setTimeout(r, 5));
    store.recordSnapshot([makeGame({ id: 1, playing: 20 })]);

    const history = store.getGameHistory(1, { since: cutoff });
    expect(history).toHaveLength(1);
    expect(history[0]?.playing).toBe(20);
  });

  it("getGameHistory respects the `limit` option", async () => {
    for (let i = 0; i < 5; i++) {
      store.recordSnapshot([makeGame({ id: 1, playing: i })]);
      await new Promise((r) => setTimeout(r, 2));
    }
    const history = store.getGameHistory(1, { limit: 2 });
    expect(history).toHaveLength(2);
    expect(history[0]?.playing).toBe(4);
    expect(history[1]?.playing).toBe(3);
  });

  it("defaults to 100 rows when limit is unspecified", async () => {
    for (let i = 0; i < 110; i++) {
      store.recordSnapshot([makeGame({ id: 1, playing: i })]);
      // Don't sleep — INSERT OR REPLACE handles same-ms collisions because
      // we step the playing count, but PK is (universe_id, taken_at) so
      // identical timestamps overwrite. Sleep briefly to keep them distinct.
      await new Promise((r) => setTimeout(r, 1));
    }
    const history = store.getGameHistory(1);
    expect(history).toHaveLength(100);
  });

  it("getLatestSnapshot returns the most recent row or null", async () => {
    expect(store.getLatestSnapshot(99)).toBeNull();
    store.recordSnapshot([makeGame({ id: 99, playing: 1 })]);
    await new Promise((r) => setTimeout(r, 5));
    store.recordSnapshot([makeGame({ id: 99, playing: 2 })]);
    const latest = store.getLatestSnapshot(99);
    expect(latest?.playing).toBe(2);
  });

  it("getTrackedUniverseIds returns distinct sorted IDs", async () => {
    store.recordSnapshot([makeGame({ id: 3 }), makeGame({ id: 1 })]);
    await new Promise((r) => setTimeout(r, 2));
    store.recordSnapshot([makeGame({ id: 2 }), makeGame({ id: 1 })]);
    expect(store.getTrackedUniverseIds()).toEqual([1, 2, 3]);
  });

  it("prune removes snapshots strictly older than the cutoff and returns the count", async () => {
    store.recordSnapshot([makeGame({ id: 1, playing: 1 })]);
    await new Promise((r) => setTimeout(r, 10));
    const cutoff = new Date();
    await new Promise((r) => setTimeout(r, 10));
    store.recordSnapshot([makeGame({ id: 1, playing: 2 })]);

    const removed = store.prune(cutoff);
    expect(removed).toBe(1);
    const history = store.getGameHistory(1);
    expect(history).toHaveLength(1);
    expect(history[0]?.playing).toBe(2);
  });

  it("close is idempotent", () => {
    store.close();
    expect(() => store.close()).not.toThrow();
  });

  it("persists across re-open of the same DB path", async () => {
    const path = join(dir, "persist.db");
    const a = new SnapshotStore({ dbPath: path });
    a.recordSnapshot([makeGame({ id: 42, playing: 7 })]);
    a.close();

    const b = new SnapshotStore({ dbPath: path });
    expect(b.getTrackedUniverseIds()).toEqual([42]);
    expect(b.getLatestSnapshot(42)?.playing).toBe(7);
    b.close();
  });

  it("getMetadata returns null for an unknown universe", () => {
    expect(store.getMetadata(404)).toBeNull();
  });
});
