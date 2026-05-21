import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gameFixture, makeRunner, summaryFixture } from "./_helpers.js";

describe("cli top", () => {
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

  it("ranks by --rank-by visits in --json mode", async () => {
    const searchGames = vi.fn().mockResolvedValue([summaryFixture(1, 100), summaryFixture(2, 100)]);
    const getGames = vi
      .fn()
      .mockResolvedValue([gameFixture(1, { visits: 10 }), gameFixture(2, { visits: 1_000_000 })]);
    const run = makeRunner({ searchGames, getGames });
    const exit = await run(["--json", "top", "--genre", "simulator", "--rank-by", "visits"]);
    expect(exit).not.toHaveBeenCalled();
    const out = JSON.parse(stdoutText()) as { games: Array<{ id: number }> };
    expect(out.games[0]?.id).toBe(2);
  });

  it("rejects an unknown --rank-by value with exit 1", async () => {
    const run = makeRunner({});
    const exit = await run(["top", "--genre", "simulator", "--rank-by", "bogus"]);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("requires --genre (Commander error)", async () => {
    const run = makeRunner({});
    const exit = await run(["top"]);
    expect(exit).toHaveBeenCalled();
  });

  it("renders a pretty table with the # column", async () => {
    const searchGames = vi.fn().mockResolvedValue([summaryFixture(11, 500)]);
    const getGames = vi.fn().mockResolvedValue([gameFixture(11, { name: "Hit", playing: 500 })]);
    const run = makeRunner({ searchGames, getGames });
    await run(["--no-color", "top", "--genre", "rpg"]);
    expect(stdoutText()).toContain("Hit");
  });
});
