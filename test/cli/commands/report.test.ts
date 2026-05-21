import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gameFixture, makeRunner, summaryFixture } from "./_helpers.js";

describe("cli report", () => {
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

  it("prints clean markdown headings in pretty mode", async () => {
    const searchGames = vi.fn().mockResolvedValue([summaryFixture(1, 1000)]);
    const getGames = vi.fn().mockResolvedValue([gameFixture(1, { name: "TopSim", playing: 1000 })]);
    const run = makeRunner({ searchGames, getGames });
    await run(["--no-color", "report", "--genre", "simulator", "--limit", "3"]);
    const text = stdoutText();
    expect(text).toMatch(/^# Market report: simulator/m);
    expect(text).toContain("## Top games");
    expect(text).toContain("## Aggregate stats");
    expect(text).toContain("TopSim");
    // pretty mode must NOT pollute the markdown stream with JSON braces
    expect(text.startsWith("{")).toBe(false);
  });

  it("emits structured payload in --json mode", async () => {
    const searchGames = vi.fn().mockResolvedValue([summaryFixture(1, 1000)]);
    const getGames = vi.fn().mockResolvedValue([gameFixture(1, { name: "TopSim", playing: 1000 })]);
    const run = makeRunner({ searchGames, getGames });
    const exit = await run(["--json", "report", "--genre", "simulator", "--limit", "3"]);
    expect(exit).not.toHaveBeenCalled();
    const out = JSON.parse(stdoutText()) as {
      markdown: string;
      structured: { topGames: unknown[]; aggregates: { gameCount: number } };
    };
    expect(out.markdown).toContain("# Market report: simulator");
    expect(out.structured.aggregates.gameCount).toBe(1);
  });

  it("rejects --limit > 20 with exit 1", async () => {
    const run = makeRunner({});
    const exit = await run(["report", "--genre", "simulator", "--limit", "99"]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
