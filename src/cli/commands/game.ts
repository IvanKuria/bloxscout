import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { RobloxNotFoundError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";
import { parseUniverseId } from "./shared.js";

/**
 * `bloxscout game <universeId>` — pretty key:value block (or full JSON) for
 * a single game's metadata.
 */
export function buildGameCommand(getClient: () => RobloxClient): Command {
  return new Command("game")
    .description("Fetch a single game's full metadata")
    .argument("<universeId>", "Roblox universe id (integer)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout game 142823291\n  $ bloxscout game 142823291 --json --pretty",
    )
    .action(async (rawId: string, _options: unknown, command: Command) => {
      const universeId = parseUniverseId(rawId);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const [game] = await getClient().getGames([universeId]);
      if (game === undefined) {
        throw new RobloxNotFoundError(`No game found for universeId ${universeId}`, {
          endpoint: "/v1/games",
        });
      }
      print(
        { game },
        {
          kind: "kv",
          spec: {
            title: `${game.name} (${game.id})`,
            pairs: [
              ["name", game.name],
              ["id", game.id],
              ["rootPlaceId", game.rootPlaceId],
              ["creator", `${game.creator.name} (${game.creator.type} #${game.creator.id})`],
              ["genre", game.genre],
              ["playing", game.playing],
              ["visits", game.visits],
              ["favorites", game.favoritedCount],
              ["maxPlayers", game.maxPlayers],
              ["created", game.created],
              ["updated", game.updated],
              ["description", truncate(game.description, 240)],
            ],
          },
        },
        fmt,
      );
    });
}

function truncate(value: string | null, max: number): string | null {
  if (value === null) return null;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
