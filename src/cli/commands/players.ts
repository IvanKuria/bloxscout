import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getFormatOptions, print } from "../format.js";
import { parseUniverseIds } from "./shared.js";

/**
 * `bloxscout players <universeId...>` — live CCU + visits for one or more
 * games. We piggy-back on `getGames` to surface the name column (same single
 * upstream call as `getPlayerCounts`, so no extra round-trip cost).
 */
export function buildPlayersCommand(getClient: () => RobloxClient): Command {
  return new Command("players")
    .description("Show current CCU and total visits for one or more games")
    .argument("<universeIds...>", "one or more Roblox universe ids")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout players 142823291\n  $ bloxscout players 142823291 920587237 --json",
    )
    .action(async (rawIds: string[], _options: unknown, command: Command) => {
      const universeIds = parseUniverseIds(rawIds);
      const fmt = getFormatOptions(command.optsWithGlobals());
      // `getGames` covers everything `getPlayerCounts` returns plus names —
      // one upstream call instead of two.
      const games = await getClient().getGames(universeIds);
      const rows = games.map((g) => ({
        universeId: g.id,
        name: g.name,
        playing: g.playing,
        visits: g.visits,
      }));
      print(
        { counts: rows },
        {
          kind: "table",
          spec: {
            title: `Live presence (${rows.length})`,
            head: ["id", "name", "playing", "visits"],
            rows,
            toRow: (r) => [r.universeId, r.name, r.playing, r.visits],
            alignments: ["right", "left", "right", "right"],
          },
        },
        fmt,
      );
    });
}
