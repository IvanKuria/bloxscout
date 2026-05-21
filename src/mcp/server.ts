import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { RobloxClient } from "../core/roblox-client.js";
import { BloxscoutError, mapToMcpError } from "../shared/errors.js";
import { allTools } from "./tools/index.js";
import type { ToolContext, ToolDefinition } from "./tools/types.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { name: string; version: string };

export interface CreateMcpServerOptions {
  /**
   * Inject a pre-configured `RobloxClient`. Tests use this to substitute a
   * client backed by stub methods; production builds let the server build
   * its own with default cache + UA.
   */
  client?: RobloxClient;
  /**
   * Optional registry override. Defaults to the full Phase 2 tool set
   * (`allTools`). Mainly an extension hook for downstream forks; tests
   * use it to scope to a single tool.
   */
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool definitions
  tools?: ReadonlyArray<ToolDefinition<any, any>>;
}

/**
 * Build the Bloxscout MCP server instance.
 *
 * The returned `Server` already has both `tools/list` and `tools/call`
 * handlers wired up — caller just needs to `connect` it to a transport
 * (`StdioServerTransport` for the bin entry, or the in-process pair from
 * the SDK for tests).
 *
 * The same `RobloxClient` instance backs every tool call, so its LRU cache
 * is shared across the server's lifetime. Errors thrown by handlers are
 * trapped and returned as `{ isError: true, content: [...] }` per the MCP
 * convention — the server never crashes on a tool failure.
 */
export function createMcpServer(options: CreateMcpServerOptions = {}): Server {
  const server = new Server(
    { name: pkg.name, version: pkg.version },
    { capabilities: { tools: {} } },
  );

  const client = options.client ?? new RobloxClient();
  const ctx: ToolContext = { client };
  const tools = options.tools ?? allTools;
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool definitions
  const byName = new Map<string, ToolDefinition<any, any>>(tools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema, {
        $refStrategy: "none",
        target: "jsonSchema7",
      }) as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (tool === undefined) {
      const err = mapToMcpError(
        new BloxscoutError(`Unknown tool: ${request.params.name}`, "VALIDATION_ERROR"),
      );
      return errorResponse(err.message, err);
    }

    let parsed: unknown;
    try {
      parsed = tool.inputSchema.parse(request.params.arguments ?? {});
    } catch (err) {
      const mapped = mapToMcpError(
        new BloxscoutError(
          `Invalid arguments for ${tool.name}: ${err instanceof Error ? err.message : String(err)}`,
          "VALIDATION_ERROR",
        ),
      );
      return errorResponse(mapped.message, mapped);
    }

    try {
      const result = await tool.handler(parsed, ctx);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const mapped = mapToMcpError(err);
      return errorResponse(`[${mapped.code}] ${mapped.message}`, mapped);
    }
  });

  return server;
}

/**
 * Shape an MCP error response. We pack the structured payload into a single
 * text content block so MCP clients without rich error UI still get the
 * code, message, and any retry-after hint inline.
 */
function errorResponse(
  message: string,
  payload: ReturnType<typeof mapToMcpError>,
): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { error: { code: payload.code, message, data: payload.data } },
          null,
          2,
        ),
      },
    ],
  };
}

/**
 * Start the Bloxscout MCP server over stdio. Blocks until the transport closes.
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
