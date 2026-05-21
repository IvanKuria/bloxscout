#!/usr/bin/env node
import { startMcpServer } from "./mcp/server.js";

startMcpServer().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`bloxscout-mcp: ${message}\n`);
  process.exit(1);
});
