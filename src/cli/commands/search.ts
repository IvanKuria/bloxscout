import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface SearchOpts {
  limit?: string;
}

/**
 * `bloxscout search <keyword>` — thin wrapper over `RobloxClient.searchGames`.
 *
 * Pretty output: id, name, creator, players (consistent column order with
 * `players` so eyeballing two outputs side-by-side stays easy).
 */
export function buildSearchCommand(getClient: () => RobloxClient): Command {
  return new Command("search")
    .description("Search Roblox's catalog by keyword")
    .argument("<keyword>", "search query")
    .option("-l, --limit <n>", "max results (1-100)", "25")
    .addHelpText(
      "after",
      `\nExamples:\n  $ bloxscout search "obby" --limit 10\n  $ bloxscout search brookhaven --json`,
    )
    .action(async (keyword: string, options: SearchOpts, command: Command) => {
      const limit = parseLimit(options.limit, 25);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const results = await getClient().searchGames(keyword, { limit });
      print(
        { results },
        {
          kind: "table",
          spec: {
            title: `Search results for "${keyword}" (${results.length})`,
            head: ["id", "name", "creator", "players"],
            rows: results,
            toRow: (g) => [g.universeId, g.name, g.creatorName, g.playerCount],
            alignments: ["right", "left", "left", "right"],
          },
        },
        fmt,
      );
    });
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new BloxscoutError("limit must be an integer between 1 and 100", "VALIDATION_ERROR");
  }
  return n;
}
