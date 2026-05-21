import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getTopByGenre } from "../../mcp/tools/get-top-by-genre.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface TopOpts {
  genre: string;
  limit?: string;
  rankBy?: string;
}

const VALID_RANK_BY = new Set(["playing", "visits", "favoritedCount"]);

/**
 * `bloxscout top --genre <g>` — top games in a genre, ranked by `playing`
 * (default), `visits`, or `favoritedCount`. CLI wrapper over the
 * `get_top_by_genre` MCP tool.
 */
export function buildTopCommand(getClient: () => RobloxClient): Command {
  return new Command("top")
    .description("List the top games in a genre, ranked by CCU, visits, or favorites")
    .requiredOption("-g, --genre <genre>", "genre slug (e.g. simulator, rpg, fps, obby)")
    .option("-l, --limit <n>", "max games returned (1-100)", "10")
    .option(
      "-r, --rank-by <metric>",
      "ranking metric: playing | visits | favoritedCount",
      "playing",
    )
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout top --genre simulator\n  $ bloxscout top --genre rpg --rank-by visits --limit 20",
    )
    .action(async (options: TopOpts, command: Command) => {
      const limit = parseLimit(options.limit, 10);
      const rankBy = parseRankBy(options.rankBy);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await getTopByGenre.handler(
        { genre: options.genre, rankBy, limit },
        { client: getClient() },
      );
      const games = result.games;
      print(
        result,
        {
          kind: "table",
          spec: {
            title: `Top ${options.genre} by ${rankBy} (${games.length})`,
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

function parseRankBy(raw: string | undefined): "playing" | "visits" | "favoritedCount" {
  const v = raw ?? "playing";
  if (!VALID_RANK_BY.has(v)) {
    throw new BloxscoutError(
      `--rank-by must be one of: ${[...VALID_RANK_BY].join(", ")} (got "${v}")`,
      "VALIDATION_ERROR",
    );
  }
  return v as "playing" | "visits" | "favoritedCount";
}
