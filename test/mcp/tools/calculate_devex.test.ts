import type { RobloxClient } from "@bloxscout/core/roblox-client";
import { describe, expect, it } from "vitest";
import { calculateDevexTool } from "../../../src/mcp/tools/calculate_devex.js";
import type { ToolContext } from "../../../src/mcp/tools/types.js";

const ctx: ToolContext = { client: {} as unknown as RobloxClient };

describe("calculate_devex tool", () => {
  it("has a stable name and an LLM-ready description", () => {
    expect(calculateDevexTool.name).toBe("calculate_devex");
    expect(calculateDevexTool.description).toContain("Robux");
    expect(calculateDevexTool.description).toContain("USD");
    expect(calculateDevexTool.description).toContain("30,000");
  });

  it("exposes Zod schemas for inputs and outputs", () => {
    // Tool now conforms to the ToolDefinition contract: schemas are Zod, not
    // JSON Schema. Validate behavior via .safeParse rather than the legacy
    // JSON-schema `properties` shape.
    expect(calculateDevexTool.inputSchema.safeParse({ robux: 100 }).success).toBe(true);
    expect(
      calculateDevexTool.inputSchema.safeParse({ robux: 100, rateUsdPerRobux: 0.0038 }).success,
    ).toBe(true);
    expect(
      calculateDevexTool.outputSchema.safeParse({
        robux: 100,
        usd: 0.38,
        rateUsdPerRobux: 0.0038,
      }).success,
    ).toBe(true);
  });

  it("computes a payout above minimum without the flag", async () => {
    const result = await calculateDevexTool.handler({ robux: 100_000 }, ctx);
    expect(result.usd).toBe(380);
    expect(result.payoutMinimumNotMet).toBeUndefined();
  });

  it("flags below-minimum balances", async () => {
    const result = await calculateDevexTool.handler({ robux: 5_000 }, ctx);
    expect(result.payoutMinimumNotMet).toBe(true);
  });

  it("honors a custom rate override", async () => {
    const result = await calculateDevexTool.handler(
      { robux: 100_000, rateUsdPerRobux: 0.0035 },
      ctx,
    );
    expect(result.usd).toBe(350);
    expect(result.rateUsdPerRobux).toBe(0.0035);
  });

  it("rejects negative robux via the input schema", () => {
    expect(calculateDevexTool.inputSchema.safeParse({ robux: -1 }).success).toBe(false);
  });
});
