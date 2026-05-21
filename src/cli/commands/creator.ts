import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

/**
 * `bloxscout creator <userId>` — user-style creator profile lookup.
 */
export function buildCreatorCommand(getClient: () => RobloxClient): Command {
  return new Command("creator")
    .description("Look up a user-style creator's profile")
    .argument("<userId>", "Roblox user id (integer)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout creator 1\n  $ bloxscout creator 1 --json --pretty",
    )
    .action(async (rawId: string, _options: unknown, command: Command) => {
      const userId = parsePositiveInt(rawId, "userId");
      const fmt = getFormatOptions(command.optsWithGlobals());
      const user = await getClient().getCreator(userId);
      print(
        { user },
        {
          kind: "kv",
          spec: {
            title: `${user.displayName} (@${user.name})`,
            pairs: [
              ["id", user.id],
              ["name", user.name],
              ["displayName", user.displayName],
              ["verified", user.hasVerifiedBadge],
              ["banned", user.isBanned],
              ["created", user.created],
              ["description", user.description.length === 0 ? null : user.description],
            ],
          },
        },
        fmt,
      );
    });
}

function parsePositiveInt(raw: string, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new BloxscoutError(
      `${label} must be a positive integer (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}
