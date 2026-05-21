/**
 * MCP tool: `calculate_devex`.
 *
 * Pure-function wrapper around `calculateDevex` from `src/core/calculators.ts`.
 * No network calls, no client needed — declared here for symmetry with the
 * other tool files in this directory.
 */

import {
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  DEVEX_PAYOUT_MINIMUM_ROBUX,
  calculateDevex,
} from "../../core/calculators.js";
import {
  type CalculateDevexInput,
  CalculateDevexInputSchema,
  type CalculateDevexOutput,
  CalculateDevexOutputSchema,
} from "../../shared/schemas.js";
import type { ToolContext, ToolDefinition } from "./types.js";

const TOOL_NAME = "calculate_devex";

const TOOL_DESCRIPTION = [
  "Convert a Robux balance into USD using the Roblox Developer Exchange (DevEx) rate.",
  "",
  `Default rate is ${DEFAULT_DEVEX_RATE_USD_PER_ROBUX} USD per Earned Robux, the current published`,
  "Roblox DevEx rate (raised from 0.0035 on 2025-09-05). Callers may override",
  "via `rateUsdPerRobux` — for example, pass 0.0035 to compute payout for",
  "Robux earned before the rate change.",
  "",
  `The result includes a \`payoutMinimumNotMet: true\` flag whenever the Robux input is below the DevEx payout minimum of ${DEVEX_PAYOUT_MINIMUM_ROBUX.toLocaleString()} Earned Robux per month.`,
  "Use this flag to warn end users that the balance cannot be cashed out yet.",
  "",
  "Pure function — deterministic, no network calls, no side effects.",
].join("\n");

export async function calculateDevexHandler(
  input: CalculateDevexInput,
  _ctx: ToolContext,
): Promise<CalculateDevexOutput> {
  const result = calculateDevex(input.robux, {
    ...(input.rateUsdPerRobux !== undefined ? { rateUsdPerRobux: input.rateUsdPerRobux } : {}),
  });
  return CalculateDevexOutputSchema.parse(result);
}

export const calculateDevexInfo: ToolDefinition<
  typeof CalculateDevexInputSchema,
  typeof CalculateDevexOutputSchema
> = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  inputSchema: CalculateDevexInputSchema,
  outputSchema: CalculateDevexOutputSchema,
  handler: calculateDevexHandler,
};

/** @deprecated Legacy export retained for the calculate_devex test suite. */
export const calculateDevexTool = calculateDevexInfo;
