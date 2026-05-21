import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { calculateDevexHandler } from "../../mcp/tools/calculate_devex.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface DevexOpts {
  rate?: string;
}

/**
 * `bloxscout devex <robux> [--rate <r>]` — Robux → USD via the current DevEx
 * rate (overridable). Pretty mode prints a key:value block and warns when the
 * Robux amount is below the 30,000 payout minimum.
 */
export function buildDevexCommand(getClient: () => RobloxClient): Command {
  return new Command("devex")
    .description("Convert a Robux balance into USD via the DevEx rate")
    .argument("<robux>", "Robux balance (non-negative integer)")
    .option("--rate <r>", "override USD/Robux rate (default: current DevEx rate)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout devex 100000\n  $ bloxscout devex 30000 --rate 0.0035\n  $ bloxscout devex 50000 --json",
    )
    .action(async (rawRobux: string, options: DevexOpts, command: Command) => {
      const robux = parseRobux(rawRobux);
      const rate = options.rate !== undefined ? parseRate(options.rate) : undefined;
      const fmt = getFormatOptions(command.optsWithGlobals());
      // calculateDevex is a pure function — the client is unused by the
      // handler. We pass it anyway to satisfy the shared ToolContext shape.
      const result = await calculateDevexHandler(
        {
          robux,
          ...(rate !== undefined ? { rateUsdPerRobux: rate } : {}),
        },
        { client: getClient() },
      );
      if (result.payoutMinimumNotMet === true && !fmt.json) {
        process.stderr.write(
          "warning: Robux balance is below the DevEx 30,000 payout minimum — this amount cannot be cashed out.\n",
        );
      }
      print(
        result,
        {
          kind: "kv",
          spec: {
            title: "DevEx",
            pairs: [
              ["Robux", result.robux.toLocaleString("en-US")],
              ["USD", `$${result.usd.toFixed(2)}`],
              ["Rate", `$${result.rateUsdPerRobux}/Robux`],
              [
                "PayoutMinimumNotMet",
                result.payoutMinimumNotMet === true ? "true (cannot cash out)" : "false",
              ],
            ],
          },
        },
        fmt,
      );
    });
}

function parseRobux(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new BloxscoutError(
      `robux must be a non-negative number (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}

function parseRate(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BloxscoutError(`--rate must be a positive number (got "${raw}")`, "VALIDATION_ERROR");
  }
  return n;
}
