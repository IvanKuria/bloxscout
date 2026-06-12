import type { Command } from "commander";
import type { HostedDataClient } from "../../core/hosted-data.js";
import type { RobloxClient } from "../../core/roblox-client.js";
import type { SnapshotStore } from "../../core/snapshots.js";
import { buildBreakoutsCommand } from "./breakouts.js";
import { buildCompareCommand } from "./compare.js";
import { buildCreatorCommand } from "./creator.js";
import { buildCreatorsCommand } from "./creators.js";
import { buildDevexCommand } from "./devex.js";
import { buildGameCommand } from "./game.js";
import { buildGroupCommand } from "./group.js";
import { buildIconCommand } from "./icon.js";
import { buildMomentumCommand } from "./momentum.js";
import { buildPlayersCommand } from "./players.js";
import { buildReportCommand } from "./report.js";
import { buildRevenueCommand } from "./revenue.js";
import { buildSearchCommand } from "./search.js";
import { buildSnapshotCommand } from "./snapshot.js";
import { buildTopCommand } from "./top.js";
import { buildTrendingCommand } from "./trending.js";
import { buildUpAndComingCommand } from "./up-and-coming.js";

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
  getStore: () => SnapshotStore,
  getHosted: () => HostedDataClient | undefined = () => undefined,
): void {
  program.addCommand(buildSearchCommand(getClient));
  program.addCommand(buildGameCommand(getClient));
  program.addCommand(buildPlayersCommand(getClient));
  program.addCommand(buildCompareCommand(getClient));
  program.addCommand(buildCreatorCommand(getClient));
  program.addCommand(buildGroupCommand(getClient));
  program.addCommand(buildIconCommand(getClient));
  // v0.1.1 — non-ID-driven CLI surface.
  program.addCommand(buildTrendingCommand(getClient, getHosted));
  program.addCommand(buildTopCommand(getClient));
  program.addCommand(buildReportCommand(getClient));
  program.addCommand(buildDevexCommand(getClient));
  program.addCommand(buildRevenueCommand(getClient));
  program.addCommand(buildUpAndComingCommand(getClient, getStore, getHosted));
  program.addCommand(buildCreatorsCommand(getClient));
  program.addCommand(buildSnapshotCommand(getClient, getStore));
  // v0.2 — hosted-dataset surface.
  program.addCommand(buildMomentumCommand(getClient, getHosted));
  program.addCommand(buildBreakoutsCommand(getClient, getHosted));
}
