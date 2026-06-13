import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeRunner } from "./_helpers.js";

const GENERATED_AT = "2026-06-12T12:00:00.000Z";

function viewEntry(universeId: number, zScore24h: number) {
  return {
    universeId,
    name: `Game ${universeId}`,
    genre: "Simulation",
    playing: 1000 * universeId,
    avg24h: 900,
    peak24h: 1200,
    growth24hPct: 0.5,
    growth7dPct: 1.1,
    zScore24h,
    visitsDelta24h: 5000,
  };
}

describe("cli momentum + breakouts", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  const stdoutText = (): string => stdoutSpy.mock.calls.map((c) => c[0]).join("");

  it("momentum renders genre aggregates from the hosted dataset", async () => {
    const hosted = {
      getGenresView: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        generatedAt: GENERATED_AT,
        genres: [
          {
            genre: "Simulation",
            gameCount: 40,
            totalPlaying: 400_000,
            growth24hPct: 0.25,
            growth7dPct: 0.8,
            topGames: [{ universeId: 1, name: "Sim King", playing: 90_000 }],
          },
        ],
      }),
    };
    const run = makeRunner({}, {}, hosted);
    const exit = await run(["--no-color", "momentum"]);
    expect(exit).not.toHaveBeenCalled();
    const text = stdoutText();
    expect(text).toContain("Simulation");
    expect(text).toContain("25.0%");
  });

  it("momentum exits 3 when hosted data is unavailable", async () => {
    const run = makeRunner({}, {}, { getGenresView: vi.fn().mockResolvedValue(null) });
    const exit = await run(["momentum"]);
    expect(exit).toHaveBeenCalledWith(3);
  });

  it("breakouts renders anomalous games with z-scores", async () => {
    const hosted = {
      getBreakoutsView: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        generatedAt: GENERATED_AT,
        entries: [viewEntry(7, 8.2), viewEntry(8, 3.1)],
      }),
    };
    const run = makeRunner({}, {}, hosted);
    const exit = await run(["--no-color", "breakouts"]);
    expect(exit).not.toHaveBeenCalled();
    const text = stdoutText();
    expect(text).toContain("Game 7");
    expect(text).toContain("8.2");
  });

  it("breakouts emits raw JSON in --json mode", async () => {
    const hosted = {
      getBreakoutsView: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        generatedAt: GENERATED_AT,
        entries: [viewEntry(7, 8.2)],
      }),
    };
    const run = makeRunner({}, {}, hosted);
    await run(["--json", "breakouts"]);
    const out = JSON.parse(stdoutText()) as { entries: Array<{ universeId: number }> };
    expect(out.entries[0]?.universeId).toBe(7);
  });
});

describe("cli trending (hosted growth columns)", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("shows growth columns when served from the hosted dataset", async () => {
    const hosted = {
      getTrendingView: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        generatedAt: GENERATED_AT,
        entries: [viewEntry(3, 4.0)],
      }),
    };
    const getGames = vi
      .fn()
      .mockResolvedValue([
        (await import("./_helpers.js")).gameFixture(3, { name: "Riser", playing: 3000 }),
      ]);
    const run = makeRunner({ getGames }, {}, hosted);
    await run(["--no-color", "trending"]);
    const text = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(text).toContain("Riser");
    expect(text).toContain("24h");
    expect(text).toContain("50.0%");
  });
});
