import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";

/**
 * `bloxscout group <groupId>` — group metadata lookup.
 */
export function buildGroupCommand(getClient: () => RobloxClient): Command {
  return new Command("group")
    .description("Fetch a group's metadata")
    .argument("<groupId>", "Roblox group id (integer)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout group 1200769\n  $ bloxscout group 1200769 --json",
    )
    .action(async (rawId: string, _options: unknown, command: Command) => {
      const groupId = parsePositiveInt(rawId, "groupId");
      const fmt = getFormatOptions(command.optsWithGlobals());
      const group = await getClient().getGroup(groupId);
      const owner = group.owner;
      print(
        { group },
        {
          kind: "kv",
          spec: {
            title: `${group.name} (${group.id})`,
            pairs: [
              ["id", group.id],
              ["name", group.name],
              ["members", group.memberCount],
              ["verified", group.hasVerifiedBadge],
              ["publicEntry", group.publicEntryAllowed],
              [
                "owner",
                owner === null
                  ? null
                  : `${owner.displayName} (@${owner.username} #${owner.userId})`,
              ],
              ["description", group.description.length === 0 ? null : group.description],
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
