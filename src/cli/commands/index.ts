import type { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import type { SnapshotStore } from "../../core/snapshots.js";
import { buildCompareCommand } from "./compare.js";
import { buildCreatorCommand } from "./creator.js";
import { buildGameCommand } from "./game.js";
import { buildGroupCommand } from "./group.js";
import { buildIconCommand } from "./icon.js";
import { buildPlayersCommand } from "./players.js";
import { buildSearchCommand } from "./search.js";
import { buildTrendingCommand } from "./trending.js";

/**
 * Register every Phase 3 + v0.1.1 subcommand against `program`.
 *
 * The `getClient` / `getStore` factories are hooks so tests can inject stubs
 * without monkey-patching modules. Production code just hands back lazily
 * constructed singletons built from defaults.
 */
export function registerCommands(
  program: Command,
  getClient: () => RobloxClient,
  _getStore: () => SnapshotStore,
): void {
  program.addCommand(buildSearchCommand(getClient));
  program.addCommand(buildGameCommand(getClient));
  program.addCommand(buildPlayersCommand(getClient));
  program.addCommand(buildCompareCommand(getClient));
  program.addCommand(buildCreatorCommand(getClient));
  program.addCommand(buildGroupCommand(getClient));
  program.addCommand(buildIconCommand(getClient));
  // v0.1.1 — non-ID-driven CLI surface.
  program.addCommand(buildTrendingCommand(getClient));
}
