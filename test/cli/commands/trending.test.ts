import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gameFixture, makeRunner, summaryFixture } from "./_helpers.js";

describe("cli trending", () => {
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

  it("emits JSON shape { games: [...] } in --json mode, ranked by playing", async () => {
    const searchGames = vi.fn().mockResolvedValue([summaryFixture(1, 50), summaryFixture(2, 200)]);
    const getGames = vi
      .fn()
      .mockResolvedValue([
        gameFixture(1, { name: "Small", playing: 50 }),
        gameFixture(2, { name: "Big", playing: 200 }),
      ]);
    const run = makeRunner({ searchGames, getGames });
    const exit = await run(["--json", "trending", "--genre", "simulator", "--limit", "5"]);
    expect(exit).not.toHaveBeenCalled();
    const out = JSON.parse(stdoutText()) as { games: Array<{ id: number; playing: number }> };
    expect(out.games.map((g) => g.id)).toEqual([2, 1]);
  });

  it("renders a pretty table that includes the # column header and game names", async () => {
    const searchGames = vi.fn().mockResolvedValue([summaryFixture(7, 5_000)]);
    const getGames = vi
      .fn()
      .mockResolvedValue([gameFixture(7, { name: "MegaHit", playing: 5_000 })]);
    const run = makeRunner({ searchGames, getGames });
    await run(["--no-color", "trending", "--genre", "rpg", "--limit", "3"]);
    const text = stdoutText();
    expect(text).toContain("Trending in rpg");
    expect(text).toContain("MegaHit");
    expect(text).toMatch(/#/);
  });

  it("rejects --limit out of range with exit 1", async () => {
    const run = makeRunner({});
    const exit = await run(["trending", "--limit", "999"]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
