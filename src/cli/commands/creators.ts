import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getTopCreatorsByGenreHandler } from "../../mcp/tools/get_top_creators_by_genre.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

interface CreatorsOpts {
  genre: string;
  limit?: string;
}

/**
 * `bloxscout creators --genre <g>` — top creators in a genre by summed CCU
 * across their live top games. CLI wrapper over `get_top_creators_by_genre`.
 */
export function buildCreatorsCommand(getClient: () => RobloxClient): Command {
  return new Command("creators")
    .description("List top creators in a genre, ranked by summed CCU across their games")
    .requiredOption("-g, --genre <genre>", "genre slug (e.g. simulator, rpg, fps, obby)")
    .option("-l, --limit <n>", "max creators returned (1-100)", "10")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout creators --genre simulator\n  $ bloxscout creators --genre rpg --limit 25 --json",
    )
    .action(async (options: CreatorsOpts, command: Command) => {
      const limit = parseLimit(options.limit, 10);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await getTopCreatorsByGenreHandler(
        { genre: options.genre, limit },
        { client: getClient() },
      );
      print(
        result,
        {
          kind: "table",
          spec: {
            title: `Top ${options.genre} creators (${result.creators.length})`,
            head: ["#", "creator", "type", "totalCCU", "gameCount", "topGame"],
            rows: result.creators,
            toRow: (c, idx) => [
              idx + 1,
              c.creatorName,
              c.creatorType,
              c.totalPlayingAcrossSeedGames,
              c.gameCount,
              c.topGame.name,
            ],
            alignments: ["right", "left", "left", "right", "right", "left"],
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
