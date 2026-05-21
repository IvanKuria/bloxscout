import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnapshotStore } from "../../../src/core/snapshots.js";
import type { ToolContext } from "../../../src/mcp/tools/types.js";
import {
  WatchGamesInputSchema,
  _resetWatchesForTests,
  watchGames,
} from "../../../src/mcp/tools/watch_games.js";
import { BloxscoutError } from "../../../src/shared/errors.js";
import { gameFixture, makeCtx } from "./_helpers.js";

function buildCtx(): {
  ctx: ToolContext;
  client: ReturnType<typeof makeCtx>["client"];
  store: SnapshotStore;
  cleanup: () => void;
} {
  const dir = mkdtempSync(join(tmpdir(), "bloxscout-watch-"));
  const store = new SnapshotStore({ dbPath: join(dir, "test.db") });
  const { ctx, client } = makeCtx();
  ctx.store = store;
  return {
    ctx,
    client,
    store,
    cleanup: () => {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe("watch_games tool", () => {
  let cleanups: Array<() => void> = [];

  beforeEach(() => {
    _resetWatchesForTests();
    cleanups = [];
  });

  afterEach(() => {
    _resetWatchesForTests();
    for (const c of cleanups) c();
    vi.useRealTimers();
  });

  it("action=start returns a watch handle in 'running' status", async () => {
    const { ctx, client, cleanup } = buildCtx();
    cleanups.push(cleanup);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 10 })]);

    const input = WatchGamesInputSchema.parse({
      action: "start",
      universeIds: [1, 2],
      intervalSeconds: 60,
    });
    const out = await watchGames.handler(input, ctx);

    expect(out.status).toBe("running");
    expect(out.watchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(out.universeIds).toEqual([1, 2]);
    expect(out.intervalSeconds).toBe(60);
    expect(out.startedAt).toBeTypeOf("string");
  });

  it("action=stop with valid watchId returns 'stopped'", async () => {
    const { ctx, client, cleanup } = buildCtx();
    cleanups.push(cleanup);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 10 })]);

    const start = await watchGames.handler(
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [1],
        intervalSeconds: 60,
      }),
      ctx,
    );
    // Let the initial fire-and-forget tick land so we have a snapshot count.
    await new Promise((r) => setTimeout(r, 30));

    const stop = await watchGames.handler(
      WatchGamesInputSchema.parse({ action: "stop", watchId: start.watchId }),
      ctx,
    );

    expect(stop.status).toBe("stopped");
    expect(stop.watchId).toBe(start.watchId);
    expect(stop.finalSnapshotCount).toBeGreaterThanOrEqual(1);
  });

  it("action=stop with bogus watchId throws VALIDATION_ERROR", async () => {
    const { ctx, cleanup } = buildCtx();
    cleanups.push(cleanup);

    const bogus = "00000000-0000-0000-0000-000000000000";
    await expect(
      watchGames.handler(WatchGamesInputSchema.parse({ action: "stop", watchId: bogus }), ctx),
    ).rejects.toBeInstanceOf(BloxscoutError);
  });

  it("action=status returns the live snapshot count + nextTickAt", async () => {
    const { ctx, client, cleanup } = buildCtx();
    cleanups.push(cleanup);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 10 })]);

    const start = await watchGames.handler(
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [1],
        intervalSeconds: 60,
      }),
      ctx,
    );
    // Wait for initial tick to register.
    await new Promise((r) => setTimeout(r, 30));

    const status = await watchGames.handler(
      WatchGamesInputSchema.parse({ action: "status", watchId: start.watchId }),
      ctx,
    );

    expect(status.status).toBe("running");
    expect(status.snapshotsRecorded).toBeGreaterThanOrEqual(1);
    expect(status.lastTickAt).toBeTypeOf("string");
    expect(status.nextTickAt).toBeTypeOf("string");
    expect(status.universeIds).toEqual([1]);
  });

  it("multiple watches have independent ids and lifecycles", async () => {
    const { ctx, client, cleanup } = buildCtx();
    cleanups.push(cleanup);
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 5 })]);

    const a = await watchGames.handler(
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [1],
        intervalSeconds: 60,
      }),
      ctx,
    );
    const b = await watchGames.handler(
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [2],
        intervalSeconds: 60,
      }),
      ctx,
    );

    expect(a.watchId).not.toBe(b.watchId);

    // Stopping `a` does not affect `b`.
    await watchGames.handler(
      WatchGamesInputSchema.parse({ action: "stop", watchId: a.watchId }),
      ctx,
    );
    await expect(
      watchGames.handler(WatchGamesInputSchema.parse({ action: "stop", watchId: a.watchId }), ctx),
    ).rejects.toBeInstanceOf(BloxscoutError);

    const stillRunning = await watchGames.handler(
      WatchGamesInputSchema.parse({ action: "status", watchId: b.watchId }),
      ctx,
    );
    expect(stillRunning.status).toBe("running");
  });

  it("increments snapshotsRecorded on each scheduled tick (fake timers)", async () => {
    vi.useFakeTimers();
    const { ctx, client, cleanup } = buildCtx();
    cleanups.push(cleanup);
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 1 }),
      gameFixture(2, { playing: 2 }),
    ]);

    const start = await watchGames.handler(
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [1, 2],
        intervalSeconds: 60,
      }),
      ctx,
    );
    // Initial fire-and-forget tick.
    await vi.advanceTimersByTimeAsync(0);
    // Advance two intervals: expect 3 total ticks * 2 games = 6 recorded.
    await vi.advanceTimersByTimeAsync(60_000 * 2 + 100);

    const status = await watchGames.handler(
      WatchGamesInputSchema.parse({ action: "status", watchId: start.watchId }),
      ctx,
    );
    expect(status.snapshotsRecorded).toBe(6);
  });

  it("input validation rejects start without universeIds", () => {
    expect(() => WatchGamesInputSchema.parse({ action: "start", intervalSeconds: 60 })).toThrow();
  });

  it("input validation rejects stop/status without watchId", () => {
    expect(() => WatchGamesInputSchema.parse({ action: "stop" })).toThrow();
    expect(() => WatchGamesInputSchema.parse({ action: "status" })).toThrow();
  });

  it("input validation enforces intervalSeconds bounds (60..3600)", () => {
    expect(() =>
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [1],
        intervalSeconds: 30,
      }),
    ).toThrow();
    expect(() =>
      WatchGamesInputSchema.parse({
        action: "start",
        universeIds: [1],
        intervalSeconds: 7200,
      }),
    ).toThrow();
  });

  it("input validation requires watchId to be a UUID", () => {
    expect(() => WatchGamesInputSchema.parse({ action: "stop", watchId: "not-a-uuid" })).toThrow();
  });
});
