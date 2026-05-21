import { createRequire } from "node:module";
import { Command } from "commander";
import { registerHelloCommand } from "./commands/hello.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string; description: string };

/**
 * Build and run the Bloxscout CLI.
 *
 * @param argv - process.argv (or equivalent) — passed through to Commander.
 */
export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("bloxscout")
    .description(pkg.description)
    .version(pkg.version, "-v, --version", "output the current version");

  registerHelloCommand(program);

  // TODO(Phase 3): register real subcommands from src/cli/commands/
  await program.parseAsync(argv);
}
