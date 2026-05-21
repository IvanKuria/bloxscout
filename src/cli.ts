#!/usr/bin/env node
import { runCli } from "./cli/index.js";

runCli(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`bloxscout: ${message}\n`);
  process.exit(1);
});
