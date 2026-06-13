import { Command } from "commander";
import type { HostedDataClient } from "../../core/hosted-data.js";
import type { RobloxClient } from "../../core/roblox-client.js";
import type { SnapshotStore } from "../../core/snapshots.js";
import { getUpAndComingHandler } from "../../mcp/tools/get_up_and_coming.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface UpAndComingOpts {
  since?: string;
  minBaseline?: string;
  limit?: string;
}

/**
 * `bloxscout up-and-coming` — small-baseline breakout games ranked by recent
 * growth-rate. CLI wrapper over the `get_up_and_coming` MCP tool.
 *
 * Empty-store behaviour: rather than silently returning `entries: []`, we
 * print a one-line hint to stderr pointing the user at `bloxscout snapshot`.
 * The exit code stays 0 — an empty result is not an error.
 */
export function buildUpAndComingCommand(
  getClient: () => RobloxClient,
  getStore: () => SnapshotStore,
  getHosted: () => HostedDataClient | undefined = () => undefined,
): Command {
  return new Command("up-and-coming")
    .description(
      "Rank small-baseline games by recent growth-rate (hosted dataset, or local snapshots for custom windows)",
    )
    .option("--since <iso>", "lower bound on the snapshot window (ISO-8601 datetime)")
    .option(
      "--min-baseline <n>",
      "filter out games whose oldest-in-window CCU exceeds this (default 5000)",
    )
    .option("-l, --limit <n>", "max rows returned (1-500)", "25")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout up-and-coming\n  $ bloxscout up-and-coming --since 2026-05-20T00:00:00Z --limit 10\n  $ bloxscout up-and-coming --min-baseline 1000 --json",
    )
    .action(async (options: UpAndComingOpts, command: Command) => {
      const limit = parseInRange(options.limit ?? "25", 1, 500, "--limit");
      const minBaselinePlayers =
        options.minBaseline !== undefined
          ? parseNonNegInt(options.minBaseline, "--min-baseline")
          : undefined;
      const since = options.since;
      const fmt = getFormatOptions(command.optsWithGlobals());
      const store = getStore();
      // Use the same client the rest of the CLI does — keeps the ctx shape
      // honest even though `get_up_and_coming` only reads from the store.
      const hosted = getHosted();
      const result = await getUpAndComingHandler(
        {
          ...(since !== undefined ? { since } : {}),
          ...(minBaselinePlayers !== undefined ? { minBaselinePlayers } : {}),
          limit,
        },
        hosted !== undefined
          ? { client: getClient(), store, hosted }
          : { client: getClient(), store },
      );

      if (result.entries.length === 0 && result.source !== "hosted" && !fmt.json) {
        process.stderr.write(
          "No snapshots recorded yet. Run `bloxscout snapshot --watch <universeIds>` first.\n",
        );
      }

      print(
        result,
        {
          kind: "table",
          spec: {
            title: `Up-and-coming (${result.entries.length})`,
            head: ["#", "name", "currentCCU", "deltaPct", "snapshots"],
            rows: result.entries,
            toRow: (e, idx) => [
              idx + 1,
              e.name ?? `universe ${e.universeId}`,
              e.currentPlaying,
              `${(e.deltaPct * 100).toFixed(1)}%`,
              e.snapshotCount ?? "—",
            ],
            alignments: ["right", "left", "right", "right", "right"],
          },
        },
        fmt,
      );
    });
}

function parseInRange(raw: string, min: number, max: number, flag: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BloxscoutError(
      `${flag} must be an integer between ${min} and ${max} (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
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
