import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { name: string; version: string };

/**
 * Build the Bloxscout MCP server instance.
 *
 * Returns a `Server` with `tools` capability declared but no tools registered.
 * Phase 2 will register tools from `src/mcp/tools/`.
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: pkg.name,
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // TODO(Phase 2): register tools from src/mcp/tools/

  return server;
}

/**
 * Start the Bloxscout MCP server over stdio. Blocks until the transport closes.
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
