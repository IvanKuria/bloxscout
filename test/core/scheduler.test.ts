import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RobloxClient } from "@bloxscout/core/roblox-client";
import { SnapshotScheduler } from "@bloxscout/core/scheduler";
import { SnapshotStore } from "@bloxscout/core/snapshots";
import type { Game } from "@bloxscout/core/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: fixture helper.
type AnyGame = any;

function makeGame(id: number, playing: number): Game {
  const g: AnyGame = {
    id,
    rootPlaceId: id,
    name: `g${id}`,
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
    favoritedCount: 1,
  };
  return g;
}

describe("SnapshotScheduler", () => {
  let dir: string;
  let store: SnapshotStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bloxscout-sched-"));
    store = new SnapshotStore({ dbPath: join(dir, "test.db") });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it("calls client.getGames and writes a snapshot on the initial tick", async () => {
    const getGames = vi.fn(async (_ids: number[]) => [makeGame(1, 42)]);
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface for the scheduler.
    const client = { getGames } as any as RobloxClient;
    const log = vi.fn();

    const scheduler = new SnapshotScheduler({ client, store, logger: log });
    scheduler.start([1], 60);
    // Initial tick is fire-and-forget; wait a microtask cycle so the async
    // recordSnapshot lands before we assert.
    await new Promise((r) => setTimeout(r, 20));
    scheduler.stop();

    expect(getGames).toHaveBeenCalledTimes(1);
    expect(store.getLatestSnapshot(1)?.playing).toBe(42);
  });

  it("ticks again after the interval elapses (fake timers)", async () => {
    vi.useFakeTimers();
    const getGames = vi.fn(async (_ids: number[]) => [makeGame(1, 1)]);
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface.
    const client = { getGames } as any as RobloxClient;
    const scheduler = new SnapshotScheduler({ client, store, logger: vi.fn() });

    scheduler.start([1], 5);
    // Drain the initial fire-and-forget tick.
    await vi.advanceTimersByTimeAsync(0);
    expect(getGames).toHaveBeenCalledTimes(1);

    // Advance two intervals — expect two more ticks.
    await vi.advanceTimersByTimeAsync(11_000);
    expect(getGames).toHaveBeenCalledTimes(3);

    scheduler.stop();
  });

  it("stop() halts subsequent ticks", async () => {
    vi.useFakeTimers();
    const getGames = vi.fn(async (_ids: number[]) => [makeGame(1, 1)]);
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface.
    const client = { getGames } as any as RobloxClient;
    const scheduler = new SnapshotScheduler({ client, store, logger: vi.fn() });

    scheduler.start([1], 5);
    await vi.advanceTimersByTimeAsync(0);
    scheduler.stop();
    expect(scheduler.running).toBe(false);

    await vi.advanceTimersByTimeAsync(30_000);
    // Only the initial tick happened.
    expect(getGames).toHaveBeenCalledTimes(1);
  });

  it("swallows errors from client.getGames and keeps scheduling", async () => {
    vi.useFakeTimers();
    const getGames = vi.fn(async (_ids: number[]) => {
      throw new Error("network down");
    });
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface.
    const client = { getGames } as any as RobloxClient;
    const log = vi.fn();
    const scheduler = new SnapshotScheduler({ client, store, logger: log });

    scheduler.start([1], 5);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(6_000);
    scheduler.stop();

    expect(getGames).toHaveBeenCalledTimes(2);
    // The error message must reach the logger.
    expect(log.mock.calls.some((c) => String(c[0]).includes("network down"))).toBe(true);
  });

  it("rejects empty universeIds and non-positive intervals", () => {
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface.
    const client = { getGames: vi.fn(async () => []) } as any as RobloxClient;
    const scheduler = new SnapshotScheduler({ client, store, logger: vi.fn() });
    expect(() => scheduler.start([], 60)).toThrow(/non-empty/);
    expect(() => scheduler.start([1], 0)).toThrow(/positive/);
    expect(() => scheduler.start([1], Number.NaN)).toThrow(/positive/);
  });
});
