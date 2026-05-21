import { describe, expect, it } from "vitest";
import { calculateDevexTool } from "../../../src/mcp/tools/calculate_devex.js";

describe("calculate_devex tool", () => {
  it("has a stable name and an LLM-ready description", () => {
    expect(calculateDevexTool.name).toBe("calculate_devex");
    expect(calculateDevexTool.description).toContain("Robux");
    expect(calculateDevexTool.description).toContain("USD");
    expect(calculateDevexTool.description).toContain("30,000");
  });

  it("exposes JSON schemas for inputs and outputs", () => {
    const input = calculateDevexTool.inputSchema as { properties: Record<string, unknown> };
    expect(input.properties.robux).toBeDefined();
    expect(input.properties.rateUsdPerRobux).toBeDefined();
    const output = calculateDevexTool.outputSchema as { properties: Record<string, unknown> };
    expect(output.properties.usd).toBeDefined();
    expect(output.properties.rateUsdPerRobux).toBeDefined();
  });

  it("computes a payout above minimum without the flag", async () => {
    const result = await calculateDevexTool.handler({ robux: 100_000 });
    expect(result.usd).toBe(380);
    expect(result.payoutMinimumNotMet).toBeUndefined();
  });

  it("flags below-minimum balances", async () => {
    const result = await calculateDevexTool.handler({ robux: 5_000 });
    expect(result.payoutMinimumNotMet).toBe(true);
  });

  it("honors a custom rate override", async () => {
    const result = await calculateDevexTool.handler({ robux: 100_000, rateUsdPerRobux: 0.0035 });
    expect(result.usd).toBe(350);
    expect(result.rateUsdPerRobux).toBe(0.0035);
  });

  it("rejects negative robux via the input schema", async () => {
    await expect(calculateDevexTool.handler({ robux: -1 })).rejects.toThrow();
  });
});
