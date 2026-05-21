import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeRunner } from "./_helpers.js";

describe("cli devex", () => {
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
  const stderrText = (): string => stderrSpy.mock.calls.map((c) => c[0]).join("");

  it("converts Robux to USD via the default rate in --json mode", async () => {
    const run = makeRunner({});
    const exit = await run(["--json", "devex", "100000"]);
    expect(exit).not.toHaveBeenCalled();
    const out = JSON.parse(stdoutText()) as {
      robux: number;
      usd: number;
      rateUsdPerRobux: number;
    };
    expect(out.robux).toBe(100000);
    expect(out.rateUsdPerRobux).toBeGreaterThan(0);
    expect(out.usd).toBeCloseTo(out.robux * out.rateUsdPerRobux, 6);
  });

  it("warns on stderr when the balance is below the DevEx payout minimum", async () => {
    const run = makeRunner({});
    await run(["--no-color", "devex", "1000"]);
    expect(stderrText()).toContain("DevEx 30,000 payout minimum");
  });

  it("honours --rate override", async () => {
    const run = makeRunner({});
    await run(["--json", "devex", "100000", "--rate", "0.0035"]);
    const out = JSON.parse(stdoutText()) as { rateUsdPerRobux: number; usd: number };
    expect(out.rateUsdPerRobux).toBe(0.0035);
    expect(out.usd).toBeCloseTo(350, 6);
  });

  it("rejects a non-numeric Robux value with exit 1", async () => {
    const run = makeRunner({});
    const exit = await run(["devex", "notanumber"]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
