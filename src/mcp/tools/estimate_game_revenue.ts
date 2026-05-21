/**
 * MCP tool: `estimate_game_revenue`.
 *
 * Heuristic monthly-revenue estimator from live CCU + visits. Pure function,
 * no network calls. Wraps `estimateGameRevenue` from `src/core/calculators.ts`.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { REVENUE_ESTIMATE_DISCLAIMER, estimateGameRevenue } from "../../core/calculators.js";
import {
  type EstimateGameRevenueInput,
  EstimateGameRevenueInputSchema,
  type EstimateGameRevenueOutput,
  EstimateGameRevenueOutputSchema,
} from "../../shared/schemas.js";

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

export type EstimateGameRevenueToolDeps = Record<string, never>;

export async function estimateGameRevenueHandler(
  input: EstimateGameRevenueInput,
  _deps: EstimateGameRevenueToolDeps = {},
): Promise<EstimateGameRevenueOutput> {
  const parsed = EstimateGameRevenueInputSchema.parse(input);
  const result = estimateGameRevenue(
    { playing: parsed.playing, visits: parsed.visits },
    {
      ...(parsed.conversionRate !== undefined ? { conversionRate: parsed.conversionRate } : {}),
      ...(parsed.averageRobuxPerPayingUser !== undefined
        ? { averageRobuxPerPayingUser: parsed.averageRobuxPerPayingUser }
        : {}),
      ...(parsed.daysActive !== undefined ? { daysActive: parsed.daysActive } : {}),
      ...(parsed.rateUsdPerRobux !== undefined ? { rateUsdPerRobux: parsed.rateUsdPerRobux } : {}),
    },
  );
  return EstimateGameRevenueOutputSchema.parse(result);
}

export const estimateGameRevenueTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  inputSchema: zodToJsonSchema(EstimateGameRevenueInputSchema, { target: "jsonSchema7" }),
  outputSchema: zodToJsonSchema(EstimateGameRevenueOutputSchema, { target: "jsonSchema7" }),
  handler: estimateGameRevenueHandler,
} as const;
