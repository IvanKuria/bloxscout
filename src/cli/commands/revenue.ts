import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { estimateGameRevenueHandler } from "../../mcp/tools/estimate_game_revenue.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface RevenueOpts {
  ccu: string;
  visits?: string;
  conversionRate?: string;
  avgRobux?: string;
  days?: string;
  rate?: string;
}

/**
 * `bloxscout revenue --ccu <n>` — heuristic monthly revenue estimate from
 * live CCU + visits. CLI wrapper over the `estimate_game_revenue` MCP tool.
 * Pretty output puts inputs, outputs, AND the disclaimer in one block so
 * callers can't miss the "this is a rough estimate" caveat.
 */
export function buildRevenueCommand(getClient: () => RobloxClient): Command {
  return new Command("revenue")
    .description("Estimate monthly revenue for a Roblox game from live CCU")
    .requiredOption("-c, --ccu <n>", "live concurrent players (CCU)")
    .option("-v, --visits <n>", "lifetime visits (informational, default 0)", "0")
    .option("--conversion-rate <r>", "fraction of CCU that pays on an active day (0-1)")
    .option("--avg-robux <n>", "average Robux per paying user per active day")
    .option("--days <n>", "active days per month (default 30)")
    .option("--rate <r>", "USD/Robux override (default: current DevEx rate)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout revenue --ccu 250000\n  $ bloxscout revenue --ccu 10000 --conversion-rate 0.03 --avg-robux 120\n  $ bloxscout revenue --ccu 500 --json",
    )
    .action(async (options: RevenueOpts, command: Command) => {
      const playing = parseNonNegInt(options.ccu, "--ccu");
      const visits = parseNonNegInt(options.visits ?? "0", "--visits");
      const conversionRate =
        options.conversionRate !== undefined
          ? parseFraction(options.conversionRate, "--conversion-rate")
          : undefined;
      const averageRobuxPerPayingUser =
        options.avgRobux !== undefined ? parsePositive(options.avgRobux, "--avg-robux") : undefined;
      const daysActive =
        options.days !== undefined ? parsePositive(options.days, "--days") : undefined;
      const rateUsdPerRobux =
        options.rate !== undefined ? parsePositive(options.rate, "--rate") : undefined;
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await estimateGameRevenueHandler(
        {
          playing,
          visits,
          ...(conversionRate !== undefined ? { conversionRate } : {}),
          ...(averageRobuxPerPayingUser !== undefined ? { averageRobuxPerPayingUser } : {}),
          ...(daysActive !== undefined ? { daysActive } : {}),
          ...(rateUsdPerRobux !== undefined ? { rateUsdPerRobux } : {}),
        },
        { client: getClient() },
      );
      print(
        result,
        {
          kind: "kv",
          spec: {
            title: "Revenue estimate",
            pairs: [
              ["CCU (playing)", result.inputs.playing.toLocaleString("en-US")],
              ["Visits (lifetime)", result.inputs.visits.toLocaleString("en-US")],
              ["Conversion rate", result.inputs.conversionRate],
              [
                "Avg Robux / paying user",
                result.inputs.averageRobuxPerPayingUser.toLocaleString("en-US"),
              ],
              ["Days active / month", result.inputs.daysActive],
              ["USD / Robux", result.inputs.rateUsdPerRobux],
              [
                "Estimated daily Robux",
                Math.round(result.estimatedDailyRobux).toLocaleString("en-US"),
              ],
              [
                "Estimated monthly Robux",
                Math.round(result.estimatedMonthlyRobux).toLocaleString("en-US"),
              ],
              ["Estimated monthly USD", `$${result.estimatedMonthlyUsd.toFixed(2)}`],
              ["Confidence", result.confidence],
              ["DISCLAIMER", result.disclaimer],
            ],
          },
        },
        fmt,
      );
    });
}

function parseNonNegInt(raw: string, flag: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new BloxscoutError(
      `${flag} must be a non-negative integer (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}

function parseFraction(raw: string, flag: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new BloxscoutError(
      `${flag} must be a number between 0 and 1 (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}

function parsePositive(raw: string, flag: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BloxscoutError(
      `${flag} must be a positive number (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}
