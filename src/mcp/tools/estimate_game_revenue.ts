/**
 * MCP tool: `estimate_game_revenue`.
 *
 * Heuristic monthly-revenue estimator from live CCU + visits. Pure function,
 * no network calls. Wraps `estimateGameRevenue` from `src/core/calculators.ts`.
 */

import { REVENUE_ESTIMATE_DISCLAIMER, estimateGameRevenue } from "@bloxscout/core/calculators";
import {
  type EstimateGameRevenueInput,
  EstimateGameRevenueInputSchema,
  type EstimateGameRevenueOutput,
  EstimateGameRevenueOutputSchema,
} from "@bloxscout/core/schemas";
import type { ToolContext, ToolDefinition } from "./types.js";

const TOOL_NAME = "estimate_game_revenue";

const TOOL_DESCRIPTION = [
  "Estimate monthly gross revenue for a Roblox game from its current concurrent players (CCU) and visits.",
  "",
  `DISCLAIMER: ${REVENUE_ESTIMATE_DISCLAIMER}`,
  "Always surface this disclaimer to the end user alongside the estimate.",
  "Confidence is always `low` in v0.1.",
  "",
  "Formula (all knobs overridable):",
  "  estimatedDailyRobux   = playing * conversionRate * averageRobuxPerPayingUser",
  "  estimatedMonthlyRobux = estimatedDailyRobux * daysActive",
  "  estimatedMonthlyUsd   = estimatedMonthlyRobux * rateUsdPerRobux",
  "",
  "Defaults:",
  "  conversionRate              = 0.02   (2% of CCU pay on a given active day)",
  "  averageRobuxPerPayingUser   = 100    (Robux per paying user per active day)",
  "  daysActive                  = 30     (monthly horizon)",
  "  rateUsdPerRobux             = 0.0038 (current DevEx rate)",
  "",
  "Inputs are typically sourced from `get_game` or `get_game_player_count`.",
  "All-time `visits` is required but currently informational only — the formula uses live `playing`.",
].join("\n");

export async function estimateGameRevenueHandler(
  input: EstimateGameRevenueInput,
  _ctx: ToolContext,
): Promise<EstimateGameRevenueOutput> {
  const result = estimateGameRevenue(
    { playing: input.playing, visits: input.visits },
    {
      ...(input.conversionRate !== undefined ? { conversionRate: input.conversionRate } : {}),
      ...(input.averageRobuxPerPayingUser !== undefined
        ? { averageRobuxPerPayingUser: input.averageRobuxPerPayingUser }
        : {}),
      ...(input.daysActive !== undefined ? { daysActive: input.daysActive } : {}),
      ...(input.rateUsdPerRobux !== undefined ? { rateUsdPerRobux: input.rateUsdPerRobux } : {}),
    },
  );
  return EstimateGameRevenueOutputSchema.parse(result);
}

export const estimateGameRevenueInfo: ToolDefinition<
  typeof EstimateGameRevenueInputSchema,
  typeof EstimateGameRevenueOutputSchema
> = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  inputSchema: EstimateGameRevenueInputSchema,
  outputSchema: EstimateGameRevenueOutputSchema,
  handler: estimateGameRevenueHandler,
};

/** @deprecated Legacy export retained for the estimate_game_revenue test suite. */
export const estimateGameRevenueTool = estimateGameRevenueInfo;
