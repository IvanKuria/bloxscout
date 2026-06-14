import type { RobloxClient } from "@bloxscout/core/roblox-client";
import { describe, expect, it } from "vitest";
import { estimateGameRevenueTool } from "../../../src/mcp/tools/estimate_game_revenue.js";
import type { ToolContext } from "../../../src/mcp/tools/types.js";

const ctx: ToolContext = { client: {} as unknown as RobloxClient };

describe("estimate_game_revenue tool", () => {
  it("has a stable name and surfaces the disclaimer in its description", () => {
    expect(estimateGameRevenueTool.name).toBe("estimate_game_revenue");
    expect(estimateGameRevenueTool.description).toContain("DISCLAIMER");
    expect(estimateGameRevenueTool.description).toContain("Heuristic estimate");
    expect(estimateGameRevenueTool.description).toContain("5-10x");
  });

  it("documents the default knobs in the description", () => {
    const desc = estimateGameRevenueTool.description;
    expect(desc).toContain("0.02");
    expect(desc).toContain("100");
    expect(desc).toContain("30");
    expect(desc).toContain("0.0038");
  });

  it("computes a monthly estimate with defaults", async () => {
    const result = await estimateGameRevenueTool.handler({ playing: 1_000, visits: 500_000 }, ctx);
    expect(result.estimatedDailyRobux).toBe(2_000);
    expect(result.estimatedMonthlyRobux).toBe(60_000);
    expect(result.estimatedMonthlyUsd).toBe(228);
    expect(result.confidence).toBe("low");
    expect(result.disclaimer).toContain("Heuristic estimate");
  });

  it("returns assumptions reflecting overridden inputs", async () => {
    const result = await estimateGameRevenueTool.handler(
      {
        playing: 500,
        visits: 0,
        conversionRate: 0.03,
        averageRobuxPerPayingUser: 150,
        daysActive: 14,
      },
      ctx,
    );
    expect(result.inputs.conversionRate).toBe(0.03);
    expect(result.inputs.averageRobuxPerPayingUser).toBe(150);
    expect(result.inputs.daysActive).toBe(14);
    // 500 * 0.03 * 150 = 2250 daily * 14 = 31500 monthly
    expect(result.estimatedMonthlyRobux).toBe(31_500);
  });

  it("rejects negative CCU via the input schema", () => {
    expect(estimateGameRevenueTool.inputSchema.safeParse({ playing: -1, visits: 0 }).success).toBe(
      false,
    );
  });

  it("rejects conversionRate > 1", () => {
    expect(
      estimateGameRevenueTool.inputSchema.safeParse({
        playing: 100,
        visits: 0,
        conversionRate: 2,
      }).success,
    ).toBe(false);
  });
});
