import { Command } from "commander";
import type { HostedDataClient } from "../../core/hosted-data.js";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getGenreMomentumHandler } from "../../mcp/tools/get_genre_momentum.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface MomentumOpts {
  limit?: string;
  sortBy?: string;
}

const SORT_VALUES = ["totalPlaying", "growth24hPct", "growth7dPct"] as const;

/**
 * `bloxscout momentum [--sort-by <metric>] [--limit <n>]` — genre-level CCU
 * and growth aggregates from the hosted dataset. CLI wrapper over the
 * `get_genre_momentum` MCP tool.
 */
export function buildMomentumCommand(
  getClient: () => RobloxClient,
  getHosted: () => HostedDataClient | undefined,
): Command {
  return new Command("momentum")
    .description("Rank Roblox genres by momentum (summed CCU + 24h/7d growth, hosted dataset)")
    .option("-s, --sort-by <metric>", "totalPlaying | growth24hPct | growth7dPct", "totalPlaying")
    .option("-l, --limit <n>", "max genres returned (1-50)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout momentum\n  $ bloxscout momentum --sort-by growth7dPct --limit 10\n  $ bloxscout momentum --json",
    )
    .action(async (options: MomentumOpts, command: Command) => {
      const sortBy = parseSortBy(options.sortBy);
      const limit = options.limit !== undefined ? Number(options.limit) : undefined;
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await getGenreMomentumHandler(
        { sortBy, ...(limit !== undefined ? { limit } : {}) },
        hostedCtx(getClient, getHosted),
      );
      print(
        result,
        {
          kind: "table",
          spec: {
            title: `Genre momentum (${result.genres.length}) — data ${result.generatedAt}`,
            head: ["#", "genre", "games", "totalCCU", "24h", "7d", "top game"],
            rows: result.genres,
            toRow: (g, idx) => [
              idx + 1,
              g.genre,
              g.gameCount,
              g.totalPlaying,
              formatPct(g.growth24hPct),
              formatPct(g.growth7dPct),
              g.topGames[0]?.name ?? "—",
            ],
            alignments: ["right", "left", "right", "right", "right", "right", "left"],
          },
        },
        fmt,
      );
    });
}

function parseSortBy(raw: string | undefined): (typeof SORT_VALUES)[number] {
  const value = raw ?? "totalPlaying";
  if ((SORT_VALUES as readonly string[]).includes(value)) {
    return value as (typeof SORT_VALUES)[number];
  }
  throw new BloxscoutError(
    `--sort-by must be one of ${SORT_VALUES.join(", ")} (got "${value}")`,
    "VALIDATION_ERROR",
  );
}

export function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function hostedCtx(
  getClient: () => RobloxClient,
  getHosted: () => HostedDataClient | undefined,
): { client: RobloxClient; hosted?: HostedDataClient } {
  const hosted = getHosted();
  return hosted !== undefined ? { client: getClient(), hosted } : { client: getClient() };
}
