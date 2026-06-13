import { describe, expect, it, vi } from "vitest";
import { snapshotInBatches } from "../../pipeline/ingest.js";

function fakeGame(id: number) {
  return { id, playing: id * 10, visits: id * 100, favoritedCount: id };
}

describe("snapshotInBatches", () => {
  it("chunks ids, paces between chunks, and concatenates results", async () => {
    const calls: number[][] = [];
    const client = {
      getGames: vi.fn(async (ids: number[]) => {
        calls.push(ids);
        return ids.map(fakeGame);
      }),
    };
    const sleeps: number[] = [];
    const games = await snapshotInBatches(client as never, [1, 2, 3, 4, 5], {
      chunkSize: 2,
      delayMs: 400,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(calls).toEqual([[1, 2], [3, 4], [5]]);
    expect(games.map((g) => g.id)).toEqual([1, 2, 3, 4, 5]);
    // No sleep after the final chunk.
    expect(sleeps).toEqual([400, 400]);
  });

  it("skips failed chunks instead of aborting the whole run", async () => {
    let call = 0;
    const client = {
      getGames: vi.fn(async (ids: number[]) => {
        call += 1;
        if (call === 2) throw new Error("429 too many requests");
        return ids.map(fakeGame);
      }),
    };
    const log = vi.fn();
    const games = await snapshotInBatches(client as never, [1, 2, 3, 4, 5, 6], {
      chunkSize: 2,
      delayMs: 0,
      sleep: async () => {},
      log,
    });
    expect(games.map((g) => g.id)).toEqual([1, 2, 5, 6]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("chunk 2/3 failed"));
  });
});
