import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeRunner } from "./_helpers.js";

describe("cli revenue", () => {
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

  it("emits a structured estimate with disclaimer in --json mode", async () => {
    const run = makeRunner({});
    const exit = await run(["--json", "revenue", "--ccu", "10000"]);
    expect(exit).not.toHaveBeenCalled();
    const out = JSON.parse(stdoutText()) as {
      inputs: { playing: number };
      estimatedMonthlyUsd: number;
      disclaimer: string;
      confidence: string;
    };
    expect(out.inputs.playing).toBe(10000);
    expect(out.estimatedMonthlyUsd).toBeGreaterThan(0);
    expect(out.disclaimer.length).toBeGreaterThan(10);
    expect(out.confidence).toBe("low");
  });

  it("prints the disclaimer prominently in pretty mode", async () => {
    const run = makeRunner({});
    await run(["--no-color", "revenue", "--ccu", "500"]);
    const text = stdoutText();
    expect(text).toContain("DISCLAIMER");
    expect(text).toContain("Estimated monthly USD");
  });

  it("rejects --ccu missing with Commander error", async () => {
    const run = makeRunner({});
    const exit = await run(["revenue"]);
    expect(exit).toHaveBeenCalled();
  });

  it("rejects --conversion-rate > 1 with exit 1", async () => {
    const run = makeRunner({});
    const exit = await run(["revenue", "--ccu", "100", "--conversion-rate", "1.5"]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
