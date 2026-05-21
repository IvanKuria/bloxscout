import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import type { GameIconSize } from "../../core/types.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";
import { parseUniverseId } from "./shared.js";

const VALID_SIZES: readonly GameIconSize[] = [
  "512x512",
  "256x256",
  "150x150",
  "128x128",
  "100x100",
  "50x50",
] as const;

interface IconOpts {
  size?: string;
}

/**
 * `bloxscout icon <universeId> [--size 256x256]` — prints the PNG URL for
 * the requested game thumbnail.
 */
export function buildIconCommand(getClient: () => RobloxClient): Command {
  return new Command("icon")
    .description("Get the icon (thumbnail) URL for a game")
    .argument("<universeId>", "Roblox universe id (integer)")
    .option(
      "-s, --size <size>",
      "icon size (512x512, 256x256, 150x150, 128x128, 100x100, 50x50)",
      "512x512",
    )
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout icon 142823291\n  $ bloxscout icon 142823291 --size 256x256 --json",
    )
    .action(async (rawId: string, options: IconOpts, command: Command) => {
      const universeId = parseUniverseId(rawId);
      const size = parseSize(options.size);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const icons = await getClient().getGameIcons([universeId], size);
      const [icon] = icons;
      if (icon === undefined) {
        throw new BloxscoutError(
          `No icon returned for universeId ${universeId}`,
          "ROBLOX_NOT_FOUND",
        );
      }
      print(
        { icon },
        {
          kind: "kv",
          spec: {
            title: `Icon ${size} for ${universeId}`,
            pairs: [
              ["targetId", icon.targetId],
              ["size", size],
              ["state", icon.state],
              ["url", icon.imageUrl],
            ],
          },
        },
        fmt,
      );
    });
}

function parseSize(raw: string | undefined): GameIconSize {
  const candidate = (raw ?? "512x512") as GameIconSize;
  if (!VALID_SIZES.includes(candidate)) {
    throw new BloxscoutError(
      `--size must be one of ${VALID_SIZES.join(", ")} (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return candidate;
}
