import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import type { RobloxClient } from "../../../src/core/roblox-client.js";
import { SnapshotStore } from "../../../src/core/snapshots.js";
import { gameFixture } from "./_helpers.js";

/**
 * Snapshot tests run against a real `SnapshotStore` in a tmp dir so the SQL
 * round-trip is exercised. The `--watch` loop is intentionally NOT
 * exercised — its scheduler keeps the process alive forever and would hang
 * vitest. Coverage for the scheduler itself lives in `test/core/scheduler.test.ts`.
 */
describe("cli snapshot", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let tmp: string;
  // Track every store opened during a test so we can close all SQLite handles
  // before unlinking the tmp dir. Windows can't delete files with an open
  // handle (EBUSY) — POSIX silently tolerates it. Closing is harmless on both.
  const openStores: SnapshotStore[] = [];

  function makeStore(): SnapshotStore {
    const s = new SnapshotStore({ dbPath: join(tmp, "data.db") });
    openStores.push(s);
    return s;
  }

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    tmp = mkdtempSync(join(tmpdir(), "bloxscout-snap-"));
    openStores.length = 0;
  });

  afterEach(() => {
    for (const s of openStores) {
      try {
        s.close();
      } catch {
        // already closed — fine
      }
    }
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    rmSync(tmp, { recursive: true, force: true });
  });

  const stdoutText = (): string => stdoutSpy.mock.calls.map((c) => c[0]).join("");

  function makeRunner(store: SnapshotStore, client: Partial<RobloxClient>) {
    const exit = vi.fn();
    return async (argv: string[]) => {
      await runCli(["node", "bloxscout", ...argv], {
        clientFactory: () => client as RobloxClient,
        storeFactory: () => store,
        exit: exit as unknown as (code: number) => void,
      });
      return exit;
    };
  }

  it("captures a one-shot snapshot and reports the recorded count (JSON)", async () => {
    const store = makeStore();
    const getGames = vi.fn().mockResolvedValue([gameFixture(11), gameFixture(22), gameFixture(33)]);
    const run = makeRunner(store, { getGames });
    const exit = await run(["--json", "snapshot", "11", "22", "33"]);
    expect(exit).not.toHaveBeenCalled();
    expect(getGames).toHaveBeenCalledWith([11, 22, 33]);
    const out = JSON.parse(stdoutText()) as { recorded: number; universeIds: number[] };
    expect(out.recorded).toBe(3);
    expect(out.universeIds).toEqual([11, 22, 33]);
    // History should have a row for each id we snapshotted.
    expect(store.getGameHistory(11)).toHaveLength(1);
  });

  it("prints a pretty confirmation block in non-JSON mode", async () => {
    const store = makeStore();
    const getGames = vi.fn().mockResolvedValue([gameFixture(11)]);
    const run = makeRunner(store, { getGames });
    await run(["--no-color", "snapshot", "11"]);
    const text = stdoutText();
    expect(text).toContain("Snapshot");
    expect(text).toContain("Recorded");
  });

  it("rejects an out-of-range --watch interval with exit 1 (vi.useFakeTimers so the loop never starts)", async () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      const getGames = vi.fn();
      const run = makeRunner(store, { getGames });
      const exit = await run(["snapshot", "11", "--watch", "5"]);
      expect(exit).toHaveBeenCalledWith(1);
      expect(getGames).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a non-integer universeId with exit 1", async () => {
    const store = makeStore();
    const run = makeRunner(store, {});
    const exit = await run(["snapshot", "notanumber"]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
