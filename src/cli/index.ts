import { createRequire } from "node:module";
import chalk from "chalk";
import { Command } from "commander";
import { RobloxClient } from "../core/roblox-client.js";
import { registerCommands } from "./commands/index.js";
import { exitCodeFor, toErrorPayload } from "./exit.js";
import { getFormatOptions, printError } from "./format.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string; description: string };

export interface RunCliOptions {
  /**
   * Override the `RobloxClient` factory. Defaults to constructing one with
   * the library's default options. Tests inject a stubbed client here.
   */
  clientFactory?: () => RobloxClient;
  /**
   * Override the exit handler. Defaults to `process.exit`. Tests can swap
   * this for a recording function so a failing command doesn't tear down
   * the test runner.
   */
  exit?: (code: number) => void;
}

/**
 * Build and run the Bloxscout CLI.
 *
 * Designed to be called from `src/cli.ts` (real bin) and from tests
 * (`runCli(argv, { clientFactory, exit })`).
 */
export async function runCli(argv: string[], options: RunCliOptions = {}): Promise<void> {
  const program = buildProgram(options);

  // Commander's exitOverride lets us treat `--help` and `--version` as
  // success without process.exit-ing, so tests can call runCli many times.
  program.exitOverride();

  try {
    await program.parseAsync(argv);
  } catch (err) {
    // CommanderError covers --help / --version / unknown command. Surface its
    // own exit code, no error payload.
    if (isCommanderError(err)) {
      (options.exit ?? process.exit)(err.exitCode);
      return;
    }
    const fmt = getFormatOptions(program.opts());
    const payload = toErrorPayload(err);
    printError(payload, fmt);
    (options.exit ?? process.exit)(exitCodeFor(err));
  }
}

function buildProgram(options: RunCliOptions): Command {
  const program = new Command();

  program
    .name("bloxscout")
    .description(pkg.description)
    .version(pkg.version, "-v, --version", "output the current version")
    .option("--json", "emit raw JSON to stdout instead of a pretty table", false)
    .option("--pretty", "pretty-print JSON output (no-op without --json)", false)
    .option("--no-color", "disable ANSI color in pretty output")
    .hook("preAction", (thisCommand) => {
      // Honour --no-color before any subcommand prints anything.
      if (thisCommand.opts().color === false) {
        chalk.level = 0;
      }
    });

  const clientFactory = options.clientFactory ?? (() => new RobloxClient());
  // Lazy: only construct the client when a subcommand actually fires. Keeps
  // `--help` and `--version` zero-cost and avoids spinning up the cache when
  // a test stubs the factory.
  let cached: RobloxClient | undefined;
  const getClient = (): RobloxClient => {
    if (cached === undefined) cached = clientFactory();
    return cached;
  };

  registerCommands(program, getClient);
  return program;
}

interface CommanderErrorLike {
  exitCode: number;
  code: string;
}

function isCommanderError(err: unknown): err is CommanderErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "exitCode" in err &&
    "code" in err &&
    typeof (err as CommanderErrorLike).code === "string" &&
    (err as CommanderErrorLike).code.startsWith("commander.")
  );
}
