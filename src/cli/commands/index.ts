import type { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { buildCompareCommand } from "./compare.js";
import { buildCreatorCommand } from "./creator.js";
import { buildGameCommand } from "./game.js";
import { buildGroupCommand } from "./group.js";
import { buildIconCommand } from "./icon.js";
import { buildPlayersCommand } from "./players.js";
import { buildSearchCommand } from "./search.js";

/**
 * Register every Phase 3 subcommand against `program`.
 *
 * The `getClient` factory is a hook so tests can inject a stub `RobloxClient`
 * without touching `process.env` or monkey-patching modules. Production code
 * just hands back a singleton built from defaults.
 */
export function registerCommands(program: Command, getClient: () => RobloxClient): void {
  program.addCommand(buildSearchCommand(getClient));
  program.addCommand(buildGameCommand(getClient));
  program.addCommand(buildPlayersCommand(getClient));
  program.addCommand(buildCompareCommand(getClient));
  program.addCommand(buildCreatorCommand(getClient));
  program.addCommand(buildGroupCommand(getClient));
  program.addCommand(buildIconCommand(getClient));
}
