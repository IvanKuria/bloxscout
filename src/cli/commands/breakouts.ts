import { Command } from "commander";
import type { HostedDataClient } from "../../core/hosted-data.js";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getBreakoutGamesHandler } from "../../mcp/tools/get_breakout_games.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";
import { formatPct, hostedCtx } from "./momentum.js";

interface BreakoutsOpts {
  limit?: string;
  minZ?: string;
}

/**
 * `bloxscout breakouts [--min-z <z>] [--limit <n>]` — games whose trailing
 * 24h CCU is anomalous vs their own prior week. CLI wrapper over the
 * `get_breakout_games` MCP tool (hosted dataset only).
 */
export function buildBreakoutsCommand(
  getClient: () => RobloxClient,
  getHosted: () => HostedDataClient | undefined,
): Command {
  return new Command("breakouts")
    .description("Detect games spiking right now (24h CCU anomaly z-score, hosted dataset)")
    .option("--min-z <z>", "minimum anomaly z-score (default 2)", "2")
    .option("-l, --limit <n>", "max games returned (1-100)", "20")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout breakouts\n  $ bloxscout breakouts --min-z 4 --limit 10\n  $ bloxscout breakouts --json",
    )
    .action(async (options: BreakoutsOpts, command: Command) => {
      const limit = parsePositiveInt(options.limit ?? "20", 100, "--limit");
      const minZScore = Number(options.minZ ?? "2");
      if (!Number.isFinite(minZScore) || minZScore < 0) {
        throw new BloxscoutError(
          `--min-z must be a non-negative number (got "${options.minZ}")`,
          "VALIDATION_ERROR",
        );
      }
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await getBreakoutGamesHandler(
        { limit, minZScore },
        hostedCtx(getClient, getHosted),
      );
      print(
        result,
        {
          kind: "table",
          spec: {
            title: `Breakout games (${result.entries.length}) — data ${result.generatedAt}`,
            head: ["#", "name", "genre", "playing", "z(24h)", "24h", "7d"],
            rows: result.entries,
            toRow: (e, idx) => [
              idx + 1,
              e.name ?? `universe ${e.universeId}`,
              e.genre ?? "—",
              e.playing,
              e.zScore24h === null ? "—" : e.zScore24h.toFixed(1),
              formatPct(e.growth24hPct),
              formatPct(e.growth7dPct),
            ],
            alignments: ["right", "left", "left", "right", "right", "right", "right"],
          },
        },
        fmt,
      );
    });
}

function parsePositiveInt(raw: string, max: number, flag: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new BloxscoutError(
      `${flag} must be an integer between 1 and ${max} (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}
