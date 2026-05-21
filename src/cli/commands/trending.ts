import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getTrendingGames } from "../../mcp/tools/get-trending-games.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface TrendingOpts {
  genre?: string;
  limit?: string;
}

/**
 * `bloxscout trending [--genre <g>] [--limit <n>]` — thin CLI wrapper around
 * the `get_trending_games` MCP tool. Returns games trending right now,
 * optionally filtered by genre. See the underlying tool's description for the
 * v0.1 ranking caveat (live `playing`, not week-over-week growth).
 */
export function buildTrendingCommand(getClient: () => RobloxClient): Command {
  return new Command("trending")
    .description("List games trending right now, optionally filtered by genre")
    .option("-g, --genre <genre>", "filter to a single genre (e.g. simulator, rpg, fps)")
    .option("-l, --limit <n>", "max games returned (1-100)", "25")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout trending --limit 10\n  $ bloxscout trending --genre simulator --limit 5\n  $ bloxscout trending --json",
    )
    .action(async (options: TrendingOpts, command: Command) => {
      const limit = parseLimit(options.limit, 25);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await getTrendingGames.handler(
        {
          ...(options.genre !== undefined ? { genre: options.genre } : {}),
          limit,
        },
        { client: getClient() },
      );
      const games = result.games;
      const title =
        options.genre !== undefined
          ? `Trending in ${options.genre} (${games.length})`
          : `Trending now (${games.length})`;
      print(
        result,
        {
          kind: "table",
          spec: {
            title,
            head: ["#", "name", "creator", "playing", "visits"],
            rows: games,
            toRow: (g, idx) => [idx + 1, g.name, g.creator.name, g.playing, g.visits],
            alignments: ["right", "left", "left", "right", "right"],
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
