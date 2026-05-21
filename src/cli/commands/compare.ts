import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";
import { parseUniverseId } from "./shared.js";

/**
 * `bloxscout compare <id> <id> [moreIds...]` — side-by-side metric matrix.
 * Rows are metrics, columns are games, so users can scan a single column
 * top-to-bottom without the headers scrolling off the right.
 */
export function buildCompareCommand(getClient: () => RobloxClient): Command {
  return new Command("compare")
    .description("Compare two or more games side-by-side on key metrics")
    .argument("<universeId>", "first game's universe id")
    .argument("<universeId2>", "second game's universe id")
    .argument("[moreIds...]", "additional universe ids")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout compare 142823291 920587237\n  $ bloxscout compare 142823291 920587237 4924922222 --json",
    )
    .action(
      async (
        rawA: string,
        rawB: string,
        rawRest: string[],
        _options: unknown,
        command: Command,
      ) => {
        const ids = [rawA, rawB, ...rawRest].map(parseUniverseId);
        if (ids.length > 10) {
          throw new BloxscoutError("compare: at most 10 games per call", "VALIDATION_ERROR");
        }
        const fmt = getFormatOptions(command.optsWithGlobals());
        const games = await getClient().getGames(ids);

        type MetricRow = { metric: string; values: Array<string | number> };
        const metrics: MetricRow[] = [
          { metric: "playing", values: games.map((g) => g.playing) },
          { metric: "visits", values: games.map((g) => g.visits) },
          { metric: "favorites", values: games.map((g) => g.favoritedCount) },
          {
            metric: "rating",
            values: games.map((g) => "—"), // placeholder; up/down votes live on GameSummary, not Game
          },
        ];

        const head = ["metric", ...games.map((g) => `${g.name} (${g.id})`)];
        const alignments: Array<"left" | "right"> = ["left", ...games.map(() => "right" as const)];

        print(
          { games },
          {
            kind: "table",
            spec: {
              title: `Comparison (${games.length} games)`,
              head,
              rows: metrics,
              toRow: (m) => [m.metric, ...m.values],
              alignments,
            },
          },
          fmt,
        );
      },
    );
}
