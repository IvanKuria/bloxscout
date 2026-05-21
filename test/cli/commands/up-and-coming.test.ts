import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import type { RobloxClient } from "../../../src/core/roblox-client.js";
import { SnapshotStore } from "../../../src/core/snapshots.js";
import { gameFixture } from "./_helpers.js";

/**
 * The `up-and-coming` command exercises a real `SnapshotStore` so we use a
 * throwaway SQLite file in a fresh tmpdir per test. Stubbing the store
 * factory would be possible but would also stub out the rankings query
 * itself, which is half the value of the integration check.
 */
describe("cli up-and-coming", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let tmp: string;
  // Same Windows-EBUSY guard as snapshot.test.ts — close SQLite handles
  // before unlinking the tmp dir.
  const openStores: SnapshotStore[] = [];

  function makeStore(): SnapshotStore {
    const s = new SnapshotStore({ dbPath: join(tmp, "data.db") });
    openStores.push(s);
    return s;
  }

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    tmp = mkdtempSync(join(tmpdir(), "bloxscout-uac-"));
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
  const stderrText = (): string => stderrSpy.mock.calls.map((c) => c[0]).join("");

  function makeRunner(store: SnapshotStore, client: Partial<RobloxClient> = {}) {
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

  it("prints a stderr hint and exits 0 when the snapshot store is empty", async () => {
    const store = makeStore();
    const run = makeRunner(store);
    const exit = await run(["up-and-coming"]);
    expect(exit).not.toHaveBeenCalled();
    expect(stderrText()).toContain("No snapshots recorded yet");
    expect(stderrText()).toContain("bloxscout snapshot --watch");
  });

  it("emits { entries: [] } in --json mode without the stderr hint", async () => {
    const store = makeStore();
    const run = makeRunner(store);
    await run(["--json", "up-and-coming"]);
    const out = JSON.parse(stdoutText()) as { entries: unknown[] };
    expect(out.entries).toEqual([]);
    expect(stderrText()).not.toContain("No snapshots recorded yet");
  });

  it("ranks recorded growth in --json mode", async () => {
    const store = makeStore();
    // Two snapshots ~5ms apart so `taken_at` differs — same pattern the
    // `rankings` core tests use.
    store.recordSnapshot([gameFixture(42, { name: "Climber", playing: 100 })]);
    await new Promise((r) => setTimeout(r, 8));
    store.recordSnapshot([gameFixture(42, { name: "Climber", playing: 300 })]);
    const run = makeRunner(store);
    await run(["--json", "up-and-coming", "--min-baseline", "1000"]);
    const out = JSON.parse(stdoutText()) as {
      entries: Array<{ universeId: number; currentPlaying: number; deltaPct: number }>;
    };
    expect(out.entries.length).toBeGreaterThan(0);
    expect(out.entries[0]?.universeId).toBe(42);
    expect(out.entries[0]?.deltaPct).toBeGreaterThan(0);
  });

  it("rejects --limit > 500 with exit 1", async () => {
    const store = makeStore();
    const run = makeRunner(store);
    const exit = await run(["up-and-coming", "--limit", "9999"]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
