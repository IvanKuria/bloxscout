#!/usr/bin/env node
import { runCli } from "./cli/index.js";

// runCli owns formatting + exit codes (see src/cli/index.ts). This entry
// just kicks it off; any unhandled rejection is treated as an internal
// error and surfaced with exit 3.
runCli(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`bloxscout: ${message}\n`);
  process.exit(3);
});
