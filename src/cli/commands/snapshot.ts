import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { SnapshotScheduler } from "../../core/scheduler.js";
import type { SnapshotStore } from "../../core/snapshots.js";
import { snapshotGameHandler } from "../../mcp/tools/snapshot_game.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";
import { parseUniverseIds } from "./shared.js";

interface SnapshotOpts {
  watch?: string;
}

/**
 * `bloxscout snapshot <universeIds...> [--watch <intervalSec>]` — capture a
 * one-shot snapshot or start a long-running scheduler. CLI wrapper over the
 * `snapshot_game` MCP tool. With `--watch`, the process stays in the
 * foreground and ticks until Ctrl-C — exactly what `bloxscout up-and-coming`
 * needs to have data to mine.
 */
export function buildSnapshotCommand(
  getClient: () => RobloxClient,
  getStore: () => SnapshotStore,
): Command {
  return new Command("snapshot")
    .description("Capture a snapshot of one or more games, optionally on a recurring interval")
    .argument("<universeIds...>", "one or more Roblox universe ids (1-100)")
    .option(
      "-w, --watch <intervalSec>",
      "instead of a one-shot snapshot, snapshot every <intervalSec> seconds until Ctrl-C (60-3600)",
    )
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout snapshot 920587237\n  $ bloxscout snapshot 920587237 142823291 --watch 300",
    )
    .action(async (rawIds: string[], options: SnapshotOpts, command: Command) => {
      const universeIds = parseUniverseIds(rawIds);
      if (universeIds.length > 100) {
        throw new BloxscoutError(
          "snapshot accepts at most 100 universeIds per call",
          "VALIDATION_ERROR",
        );
      }
      const fmt = getFormatOptions(command.optsWithGlobals());
      const client = getClient();
      const store = getStore();

      if (options.watch !== undefined) {
        const intervalSeconds = parseInterval(options.watch);
        await runWatch(client, store, universeIds, intervalSeconds, fmt.json);
        return;
      }

      const result = await snapshotGameHandler({ universeIds }, { client, store });
      print(
        result,
        {
          kind: "kv",
          spec: {
            title: "Snapshot",
            pairs: [
              ["Recorded", result.recorded],
              ["Taken at", result.takenAt],
              ["Universe IDs", result.universeIds.join(", ")],
            ],
          },
        },
        fmt,
      );
    });
}

async function runWatch(
  client: RobloxClient,
  store: SnapshotStore,
  universeIds: number[],
  intervalSeconds: number,
  json: boolean,
): Promise<void> {
  const scheduler = new SnapshotScheduler({ client, store });
  if (!json) {
    process.stdout.write(
      `Watching ${universeIds.length} game(s) every ${intervalSeconds}s. Ctrl-C to stop.\n`,
    );
  }
  scheduler.start(universeIds, intervalSeconds, (tick) => {
    if (json) {
      process.stdout.write(
        `${JSON.stringify({ takenAt: tick.takenAt, recorded: tick.recorded })}\n`,
      );
    } else {
      process.stdout.write(`  tick ${tick.takenAt} — recorded ${tick.recorded} game(s)\n`);
    }
  });
  // Block forever; SIGINT (Ctrl-C) tears down the process and clears the
  // setInterval timer. Callers are expected to not invoke this in tests.
  await new Promise<void>((resolve) => {
    const onSig = (): void => {
      scheduler.stop();
      resolve();
    };
    process.once("SIGINT", onSig);
    process.once("SIGTERM", onSig);
  });
}

function parseInterval(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 60 || n > 3600) {
    throw new BloxscoutError(
      `--watch interval must be an integer between 60 and 3600 seconds (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}
