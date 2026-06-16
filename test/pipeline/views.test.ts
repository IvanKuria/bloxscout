import type { HourlyFile, RawRunFile, ViewEntry } from "@bloxscout/core/hosted-format";
import { describe, expect, it } from "vitest";
import { emptyRegistry, upsertDiscovered } from "../../pipeline/registry.js";
import { computeViews, selectBreakouts } from "../../pipeline/views.js";

const NOW_ISO = "2026-06-12T12:00:00.000Z";
const NOW = Date.parse(NOW_ISO);

/** Build an hourly file for `date` where each game has rows for the given hours. */
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

function registryWith(entries: Array<[id: number, name: string, genre?: string]>) {
  const registry = emptyRegistry(NOW_ISO);
  upsertDiscovered(
    registry,
    entries.map(([id, name]) => ({ universeId: id, name })),
    NOW_ISO,
  );
  for (const [id, , genre] of entries) {
    const e = registry.games[String(id)];
    if (e && genre) e.genre = genre;
  }
  return registry;
}

describe("computeViews", () => {
  it("computes 24h growth from the oldest in-window point to the live value", () => {
    const registry = registryWith([[42, "Grower", "Simulation"]]);
    const hourly = [hourlyFile("2026-06-12", { "42": [[1, 1000, 1000, 5000]] })];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([[42, 1500, 9000]]),
      now: NOW,
    });
    const entry = views.trending.entries.find((e) => e.universeId === 42);
    expect(entry).toBeDefined();
    expect(entry?.playing).toBe(1500);
    expect(entry?.growth24hPct).toBeCloseTo(0.5);
    expect(entry?.name).toBe("Grower");
    expect(entry?.genre).toBe("Simulation");
    expect(entry?.visitsDelta24h).toBe(4000);
  });

  it("returns null growth for games with no history yet", () => {
    const registry = registryWith([[7, "Newborn"]]);
    const views = computeViews({ registry, hourlyFiles: [], run: latestRun([[7, 500]]), now: NOW });
    expect(views.trending.entries.find((e) => e.universeId === 7)).toBeUndefined();
    expect(views.upAndComing.entries.find((e) => e.universeId === 7)).toBeUndefined();
  });

  it("caps zero-baseline growth at 1000 so views stay JSON-serializable", () => {
    const registry = registryWith([[9, "FromZero"]]);
    const hourly = [hourlyFile("2026-06-12", { "9": [[1, 0]] })];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([[9, 400]]),
      now: NOW,
    });
    const entry = views.trending.entries.find((e) => e.universeId === 9);
    expect(entry?.growth24hPct).toBe(1000);
  });

  it("excludes sub-100-CCU games from trending but keeps them in up-and-coming", () => {
    const registry = registryWith([[5, "Tiny"]]);
    const hourly = [hourlyFile("2026-06-12", { "5": [[1, 60]] })];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([[5, 90]]),
      now: NOW,
    });
    expect(views.trending.entries.find((e) => e.universeId === 5)).toBeUndefined();
    expect(views.upAndComing.entries.find((e) => e.universeId === 5)).toBeDefined();
  });

  it("excludes large-baseline games from up-and-coming", () => {
    const registry = registryWith([[6, "Juggernaut"]]);
    const hourly = [hourlyFile("2026-06-12", { "6": [[1, 50_000]] })];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([[6, 80_000]]),
      now: NOW,
    });
    expect(views.upAndComing.entries.find((e) => e.universeId === 6)).toBeUndefined();
  });

  it("flags breakouts via z-score when a flat game spikes", () => {
    const registry = registryWith([
      [11, "Spiker"],
      [12, "Flatliner"],
    ]);
    // 5 prior days flat at 100; today the spiker jumps to 1000.
    const days = ["2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11"];
    const hourly = days.map((d) =>
      hourlyFile(d, {
        "11": [
          [6, 100],
          [18, 100],
        ],
        "12": [
          [6, 100],
          [18, 100],
        ],
      }),
    );
    hourly.push(hourlyFile("2026-06-12", { "11": [[6, 900]], "12": [[6, 100]] }));
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([
        [11, 1000],
        [12, 100],
      ]),
      now: NOW,
    });
    const spiker = views.breakouts.entries.find((e) => e.universeId === 11);
    const flat = views.breakouts.entries.find((e) => e.universeId === 12);
    expect(spiker).toBeDefined();
    expect(spiker?.zScore24h).toBeGreaterThanOrEqual(2);
    expect(flat).toBeUndefined();
  });

  it("aggregates genres with summed CCU and growth", () => {
    const registry = registryWith([
      [21, "Sim A", "Simulation"],
      [22, "Sim B", "Simulation"],
      [23, "Obby", "Adventure"],
    ]);
    const hourly = [
      hourlyFile("2026-06-12", { "21": [[1, 1000]], "22": [[1, 500]], "23": [[1, 200]] }),
    ];
    const views = computeViews({
      registry,
      hourlyFiles: hourly,
      run: latestRun([
        [21, 2000],
        [22, 1000],
        [23, 200],
      ]),
      now: NOW,
    });
    const sim = views.genres.genres.find((g) => g.genre === "Simulation");
    expect(sim?.gameCount).toBe(2);
    expect(sim?.totalPlaying).toBe(3000);
    // Summed series: 1500 -> 3000.
    expect(sim?.growth24hPct).toBeCloseTo(1.0);
    expect(sim?.topGames[0]?.universeId).toBe(21);
    // Sorted by totalPlaying: Simulation first.
    expect(views.genres.genres[0]?.genre).toBe("Simulation");
  });
});

function viewEntry(p: Partial<ViewEntry> & { universeId: number }): ViewEntry {
  return {
    universeId: p.universeId,
    name: p.name ?? `g${p.universeId}`,
    genre: p.genre ?? null,
    playing: p.playing ?? 0,
    avg24h: p.avg24h ?? null,
    peak24h: p.peak24h ?? null,
    growth24hPct: p.growth24hPct ?? null,
    growth7dPct: p.growth7dPct ?? null,
    zScore24h: p.zScore24h ?? null,
    visitsDelta24h: p.visitsDelta24h ?? null,
  };
}

describe("selectBreakouts", () => {
  // Regression: a young dataset has no usable z-scores, so the old z-only
  // filter returned []. It must fall back to growth (with floors applied).
  it("falls back to growth when no z-scores are available (young dataset)", () => {
    const out = selectBreakouts([
      viewEntry({ universeId: 1, playing: 18000, growth24hPct: 387 }),
      viewEntry({ universeId: 2, playing: 1300, growth24hPct: 57 }),
      viewEntry({ universeId: 3, playing: 50, growth24hPct: 900 }), // too small
      viewEntry({ universeId: 4, playing: 9000, growth24hPct: 5 }), // not surging
    ]);
    expect(out.map((e) => e.universeId)).toEqual([1, 2]);
  });

  it("ranks by z-score when enough are available", () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      viewEntry({
        universeId: 100 + i,
        playing: 5000,
        growth24hPct: 10,
        zScore24h: 2 + i * 0.1,
      }),
    );
    const out = selectBreakouts(entries);
    expect(out.length).toBe(12);
    expect(out[0]?.zScore24h ?? 0).toBeGreaterThan(out[1]?.zScore24h ?? 0);
  });

  it("never returns empty while a real accelerator exists", () => {
    const out = selectBreakouts([viewEntry({ universeId: 1, playing: 4000, growth24hPct: 120 })]);
    expect(out.length).toBe(1);
  });
});
