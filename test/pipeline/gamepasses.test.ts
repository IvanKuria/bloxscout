import type { GamePass } from "@bloxscout/core/types";
import { describe, expect, it, vi } from "vitest";
import { sampleGamePasses, selectGamePassSampleIds } from "../../pipeline/gamepasses.js";

describe("selectGamePassSampleIds", () => {
  it("returns the top-N games by playing, descending", () => {
    const run = {
      schemaVersion: 1,
      runId: "r",
      takenAt: "2026-06-13T00:00:00.000Z",
      games: [
        [10, 5, 0, 0],
        [20, 500, 0, 0],
        [30, 100, 0, 0],
        [40, 9000, 0, 0],
      ] as [number, number, number, number][],
    };
    expect(selectGamePassSampleIds(run, 2)).toEqual([40, 20]);
  });

  it("never returns more ids than exist", () => {
    const run = {
      schemaVersion: 1,
      runId: "r",
      takenAt: "2026-06-13T00:00:00.000Z",
      games: [[10, 5, 0, 0]] as [number, number, number, number][],
    };
    expect(selectGamePassSampleIds(run, 50)).toEqual([10]);
  });

  it("returns [] when topN <= 0", () => {
    const run = {
      schemaVersion: 1,
      runId: "r",
      takenAt: "2026-06-13T00:00:00.000Z",
      games: [[10, 5, 0, 0]] as [number, number, number, number][],
    };
    expect(selectGamePassSampleIds(run, 0)).toEqual([]);
  });
});

describe("sampleGamePasses", () => {
  it("fetches each id with pacing between calls and maps results", async () => {
    const byId: Record<number, GamePass[]> = {
      1: [{ id: 100, name: "VIP", price: 199 }],
      2: [],
    };
    const client = { getGamePasses: vi.fn(async (id: number) => byId[id] ?? []) };
    const sleeps: number[] = [];
    const out = await sampleGamePasses(client, [1, 2], {
      delayMs: 400,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(out).toEqual({
      1: [{ id: 100, name: "VIP", price: 199 }],
      2: [],
    });
    // One pause between the two fetches, none after the last.
    expect(sleeps).toEqual([400]);
    expect(client.getGamePasses).toHaveBeenCalledTimes(2);
  });

  it("skips a failed id without aborting the rest", async () => {
    let call = 0;
    const client = {
      getGamePasses: vi.fn(async (id: number) => {
        call += 1;
        if (call === 1) throw new Error("429");
        return [{ id: 9, name: "x", price: null }];
      }),
    };
    const log = vi.fn();
    const out = await sampleGamePasses(client, [1, 2], {
      delayMs: 0,
      sleep: async () => {},
      log,
    });
    expect(out).toEqual({ 2: [{ id: 9, name: "x", price: null }] });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("universe 1"));
  });
});
