import type { HourlyFile, RawRunFile } from "@bloxscout/core/hosted-format";
import { describe, expect, it } from "vitest";
import { emptyRegistry, upsertDiscovered } from "../../pipeline/registry.js";
import { computeViews } from "../../pipeline/views.js";

const NOW_ISO = "2026-06-13T12:00:00.000Z";
const NOW = Date.parse(NOW_ISO);
const DAY = 24 * 60 * 60 * 1000;

function hourlyFile(
  date: string,
  games: Record<string, Array<[hour: number, avg: number, peak?: number, visits?: number]>>,
): HourlyFile {
  const out: HourlyFile["games"] = {};
  for (const [id, rows] of Object.entries(games)) {
    out[id] = rows.map(([hour, avg, peak, visits]) => [
      hour,
      avg,
      peak ?? Math.round(avg),
      visits ?? 0,
      0,
    ]);
  }
  return { schemaVersion: 1, date, games: out };
}

function latestRun(games: Array<[id: number, playing: number, visits?: number]>): RawRunFile {
  return {
    schemaVersion: 1,
    runId: "run-now",
    takenAt: NOW_ISO,
    games: games.map(([id, playing, visits]) => [id, playing, visits ?? 0, 0]),
  };
}

/** Registry where each game's addedAt is `addedDaysAgo` before NOW. */
function registryWith(
  entries: Array<[id: number, name: string, genre: string, addedDaysAgo?: number]>,
) {
  const registry = emptyRegistry(NOW_ISO);
  upsertDiscovered(
    registry,
    entries.map(([id, name]) => ({ universeId: id, name })),
    NOW_ISO,
  );
  for (const [id, , genre, addedDaysAgo] of entries) {
    const e = registry.games[String(id)];
    if (!e) continue;
    e.genre = genre;
    if (addedDaysAgo !== undefined) {
      e.addedAt = new Date(NOW - addedDaysAgo * DAY).toISOString();
    }
  }
  return registry;
}

describe("saturation view", () => {
  it("emits insufficient_games when a genre has fewer than 5 games", () => {
    const registry = registryWith([
      [1, "A", "Tiny", 60],
      [2, "B", "Tiny", 60],
    ]);
    const hourly = [hourlyFile("2026-06-13", { "1": [[1, 100]], "2": [[1, 100]] })];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([
        [1, 100],
        [2, 100],
      ]),
      now: NOW,
    });
    const tiny = views.saturation.entries.find((e) => e.genre === "Tiny");
    expect(tiny).toBeDefined();
    expect(tiny?.saturationScore).toBeNull();
    expect(tiny?.reason).toBe("insufficient_games");
    expect(tiny?.whiteSpace).toBe(false);
  });

  it("scores a one-game-dominated, incumbent-locked genre as saturated", () => {
    // 6 games, one owns ~95% of players, all added 60 days ago (incumbents).
    const registry = registryWith([
      [10, "Whale", "Saturated", 60],
      [11, "b", "Saturated", 60],
      [12, "c", "Saturated", 60],
      [13, "d", "Saturated", 60],
      [14, "e", "Saturated", 60],
      [15, "f", "Saturated", 60],
    ]);
    const hourly = [
      hourlyFile("2026-06-13", {
        "10": [[1, 19_000]],
        "11": [[1, 200]],
        "12": [[1, 200]],
        "13": [[1, 200]],
        "14": [[1, 200]],
        "15": [[1, 200]],
      }),
    ];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([
        [10, 19_000],
        [11, 200],
        [12, 200],
        [13, 200],
        [14, 200],
        [15, 200],
      ]),
      now: NOW,
    });
    const sat = views.saturation.entries.find((e) => e.genre === "Saturated");
    expect(sat).toBeDefined();
    expect(sat?.saturationScore).not.toBeNull();
    expect(sat?.saturationScore ?? 0).toBeGreaterThan(40);
    expect(sat?.whiteSpace).toBe(false);
    expect(sat?.components.top1Share ?? 0).toBeGreaterThan(0.9);
    expect(sat?.components.incumbencyScore).not.toBeNull();
  });

  it("flags an even, high-headroom genre as white space", () => {
    // 6 games, evenly split, decent intensity → low saturation.
    const ids = [20, 21, 22, 23, 24, 25];
    const registry = registryWith(
      ids.map((id) => [id, `g${id}`, "WhiteSpace", 60] as [number, string, string, number]),
    );
    const hourly = [
      hourlyFile("2026-06-13", Object.fromEntries(ids.map((id) => [String(id), [[1, 1500]]]))),
    ];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun(ids.map((id) => [id, 1500])),
      now: NOW,
    });
    const ws = views.saturation.entries.find((e) => e.genre === "WhiteSpace");
    expect(ws).toBeDefined();
    expect(ws?.saturationScore ?? 100).toBeLessThan(40);
    expect(ws?.whiteSpace).toBe(true);
  });

  it("nulls incumbencyScore when addedAt history is too young", () => {
    // All games added 2 days ago — can't tell incumbents from entrants.
    const ids = [30, 31, 32, 33, 34, 35];
    const registry = registryWith(
      ids.map((id) => [id, `g${id}`, "Young", 2] as [number, string, string, number]),
    );
    const hourly = [
      hourlyFile("2026-06-13", Object.fromEntries(ids.map((id) => [String(id), [[1, 800]]]))),
    ];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun(ids.map((id) => [id, 800])),
      now: NOW,
    });
    const young = views.saturation.entries.find((e) => e.genre === "Young");
    expect(young?.components.incumbencyScore).toBeNull();
    // Score still produced from the renormalized remaining terms.
    expect(young?.saturationScore).not.toBeNull();
  });
});

describe("genre-revenue view", () => {
  it("aggregates total/median/topN estimates and sorts by total desc", () => {
    const registry = registryWith([
      [40, "Big", "Rich", 60],
      [41, "Mid", "Rich", 60],
      [42, "Small", "Rich", 60],
      [43, "Solo", "Poor", 60],
    ]);
    const hourly = [
      hourlyFile("2026-06-13", {
        "40": [[1, 10_000]],
        "41": [[1, 1000]],
        "42": [[1, 100]],
        "43": [[1, 50]],
      }),
    ];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([
        [40, 10_000],
        [41, 1000],
        [42, 100],
        [43, 50],
      ]),
      now: NOW,
    });
    expect(views.genreRevenue.confidence).toBe("low");
    expect(views.genreRevenue.disclaimer.length).toBeGreaterThan(0);
    expect(views.genreRevenue.assumptions.daysActive).toBe(30);
    const rich = views.genreRevenue.entries.find((e) => e.genre === "Rich");
    expect(rich).toBeDefined();
    expect(rich?.estTotalMonthlyUsd ?? 0).toBeGreaterThan(0);
    // Median of {10000,1000,100} CCU games is the 1000-CCU estimate < total.
    expect(rich?.estMedianGameMonthlyUsd ?? 0).toBeLessThan(rich?.estTotalMonthlyUsd ?? 0);
    expect(rich?.assumptionsOverridden).toBe(false);
    // Rich (more players) sorts before Poor.
    expect(views.genreRevenue.entries[0]?.genre).toBe("Rich");
  });
});

describe("rising-niches view", () => {
  it("ranks a growing, un-saturated, broad genre above a flat one", () => {
    // Rising: 5 evenly split games, growing 24h. Flat: high-saturation stagnant.
    const risingIds = [50, 51, 52, 53, 54];
    const flatIds = [60, 61, 62, 63, 64];
    const registry = registryWith([
      ...risingIds.map((id) => [id, `r${id}`, "Rising", 60] as [number, string, string, number]),
      ...flatIds.map((id) => [id, `f${id}`, "Flat", 60] as [number, string, string, number]),
    ]);
    // Yesterday baseline lower for Rising; flat dominated by one game.
    const yesterday = hourlyFile("2026-06-12", {
      ...Object.fromEntries(risingIds.map((id) => [String(id), [[12, 200]]])),
      "60": [[12, 9000]],
      "61": [[12, 50]],
      "62": [[12, 50]],
      "63": [[12, 50]],
      "64": [[12, 50]],
    });
    const today = hourlyFile("2026-06-13", {
      ...Object.fromEntries(risingIds.map((id) => [String(id), [[1, 400]]])),
      "60": [[1, 9000]],
      "61": [[1, 50]],
      "62": [[1, 50]],
      "63": [[1, 50]],
      "64": [[1, 50]],
    });
    const views = computeViews({
      registry,
      hourlyFiles: [yesterday, today],
      run: latestRun([
        ...risingIds.map((id) => [id, 600] as [number, number]),
        [60, 9000],
        [61, 50],
        [62, 50],
        [63, 50],
        [64, 50],
      ]),
      now: NOW,
    });
    const rising = views.risingNiches.entries.find((e) => e.genre === "Rising");
    const flat = views.risingNiches.entries.find((e) => e.genre === "Flat");
    expect(rising).toBeDefined();
    expect(flat).toBeDefined();
    expect(rising?.risingScore ?? 0).toBeGreaterThan(flat?.risingScore ?? 999);
  });

  it("falls back to 24h-only durabilityBasis when there is no 7d window", () => {
    // No hourly history at all → only the single live run point in the 7d
    // window → fewer than 2 points → null 7d growth.
    const ids = [80, 81, 82, 83, 84];
    const registry = registryWith(
      ids.map((id) => [id, `o${id}`, "OneDay", 60] as [number, string, string, number]),
    );
    const views = computeViews({
      registry,
      hourlyFiles: [],
      run: latestRun(ids.map((id) => [id, 600])),
      now: NOW,
    });
    const oneDay = views.risingNiches.entries.find((e) => e.genre === "OneDay");
    expect(oneDay).toBeDefined();
    expect(oneDay?.growth7dPct).toBeNull();
    expect(oneDay?.durabilityBasis).toBe("24h-only");
  });

  it("penalizes a single-game flash spike via durability", () => {
    // 5 games but one game owns >60% and the genre spikes on the latest day.
    const ids = [70, 71, 72, 73, 74];
    const registry = registryWith(
      ids.map((id) => [id, `s${id}`, "Spike", 60] as [number, string, string, number]),
    );
    // 6 flat prior days, then a big jump on the last → high genre z-score.
    const priorDays = [
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ];
    const hourly = priorDays.map((d) =>
      hourlyFile(d, {
        "70": [[6, 300]],
        "71": [[6, 50]],
        "72": [[6, 50]],
        "73": [[6, 50]],
        "74": [[6, 50]],
      }),
    );
    hourly.push(
      hourlyFile("2026-06-13", {
        "70": [[6, 5000]],
        "71": [[6, 50]],
        "72": [[6, 50]],
        "73": [[6, 50]],
        "74": [[6, 50]],
      }),
    );
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([
        [70, 5000],
        [71, 50],
        [72, 50],
        [73, 50],
        [74, 50],
      ]),
      now: NOW,
    });
    const spike = views.risingNiches.entries.find((e) => e.genre === "Spike");
    expect(spike).toBeDefined();
    // top1Share > 0.6 breadth penalty applies.
    expect(spike?.components.top1Share ?? 0).toBeGreaterThan(0.6);
    expect(spike?.components.durability ?? 1).toBeLessThan(1);
  });
});
