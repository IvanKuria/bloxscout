import type { DailyFile, HourlyFile, RawRunFile } from "@bloxscout/core/hosted-format";
import { HISTORY_SHARD_COUNT } from "@bloxscout/core/hosted-format";
import { describe, expect, it } from "vitest";
import { aggregateDaily, aggregateHourly, buildHistoryShards } from "../../pipeline/rollup.js";

function run(
  runId: string,
  takenAt: string,
  games: Array<[number, number, number, number]>,
): RawRunFile {
  return { schemaVersion: 1, runId, takenAt, games };
}

describe("aggregateHourly", () => {
  it("averages and peaks playing within an hour, keeping last visits/favorites", () => {
    const runs = [
      run("r1", "2026-06-11T10:05:00.000Z", [[42, 100, 1000, 50]]),
      run("r2", "2026-06-11T10:35:00.000Z", [[42, 200, 1010, 51]]),
    ];
    const hourly = aggregateHourly(runs, "2026-06-11");
    expect(hourly.date).toBe("2026-06-11");
    expect(hourly.games["42"]).toEqual([[10, 150, 200, 1010, 51]]);
  });

  it("produces one row per hour, sorted by hour", () => {
    const runs = [
      run("r2", "2026-06-11T11:05:00.000Z", [[42, 300, 1020, 52]]),
      run("r1", "2026-06-11T10:05:00.000Z", [[42, 100, 1000, 50]]),
    ];
    const hourly = aggregateHourly(runs, "2026-06-11");
    expect(hourly.games["42"]).toEqual([
      [10, 100, 100, 1000, 50],
      [11, 300, 300, 1020, 52],
    ]);
  });

  it("ignores runs taken on a different UTC date", () => {
    const runs = [
      run("r1", "2026-06-11T23:59:00.000Z", [[42, 100, 1000, 50]]),
      run("r2", "2026-06-12T00:01:00.000Z", [[42, 999, 2000, 60]]),
    ];
    const hourly = aggregateHourly(runs, "2026-06-11");
    expect(hourly.games["42"]).toEqual([[23, 100, 100, 1000, 50]]);
  });

  it("handles games that appear in only some runs", () => {
    const runs = [
      run("r1", "2026-06-11T10:05:00.000Z", [[42, 100, 1000, 50]]),
      run("r2", "2026-06-11T10:35:00.000Z", [
        [42, 200, 1010, 51],
        [7, 10, 90, 5],
      ]),
    ];
    const hourly = aggregateHourly(runs, "2026-06-11");
    expect(hourly.games["7"]).toEqual([[10, 10, 10, 90, 5]]);
  });
});

describe("aggregateDaily", () => {
  it("rolls hourly rows into one daily row per game", () => {
    const hourly: HourlyFile = {
      schemaVersion: 1,
      date: "2026-06-11",
      games: {
        "42": [
          [0, 100, 120, 1000, 50],
          [12, 200, 250, 1500, 55],
          [23, 300, 400, 2200, 60],
        ],
      },
    };
    const daily = aggregateDaily(hourly);
    expect(daily.date).toBe("2026-06-11");
    // avg of avgs, max of peaks, last visits - first visits, last favorites.
    expect(daily.games["42"]).toEqual([200, 400, 1200, 60]);
  });
});

describe("buildHistoryShards", () => {
  const generatedAt = "2026-06-12T00:10:00.000Z";

  it("assigns each game to shard universeId % HISTORY_SHARD_COUNT", () => {
    const hourly: HourlyFile = {
      schemaVersion: 1,
      date: "2026-06-11",
      games: { "300": [[10, 100, 120, 1000, 50]] },
    };
    const shards = buildHistoryShards([hourly], [], generatedAt);
    const shard = shards.get(300 % HISTORY_SHARD_COUNT);
    expect(shard).toBeDefined();
    expect(shard?.games["300"]?.hourly).toEqual([[Date.UTC(2026, 5, 11, 10), 100, 120, 1000, 50]]);
  });

  it("merges hourly points across files in ascending time order", () => {
    const day1: HourlyFile = {
      schemaVersion: 1,
      date: "2026-06-10",
      games: { "42": [[23, 100, 100, 1000, 50]] },
    };
    const day2: HourlyFile = {
      schemaVersion: 1,
      date: "2026-06-11",
      games: { "42": [[0, 110, 115, 1100, 51]] },
    };
    const shards = buildHistoryShards([day2, day1], [], generatedAt);
    const entry = shards.get(42)?.games["42"];
    expect(entry?.hourly.map((p) => p[0])).toEqual([
      Date.UTC(2026, 5, 10, 23),
      Date.UTC(2026, 5, 11, 0),
    ]);
  });

  it("includes daily rows sorted by date", () => {
    const daily1: DailyFile = {
      schemaVersion: 1,
      date: "2026-06-10",
      games: { "42": [150, 200, 500, 55] },
    };
    const daily2: DailyFile = {
      schemaVersion: 1,
      date: "2026-06-09",
      games: { "42": [120, 180, 400, 52] },
    };
    const shards = buildHistoryShards([], [daily1, daily2], generatedAt);
    expect(shards.get(42)?.games["42"]?.daily).toEqual([
      ["2026-06-09", 120, 180, 400, 52],
      ["2026-06-10", 150, 200, 500, 55],
    ]);
  });
});
