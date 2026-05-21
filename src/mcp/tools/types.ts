import type { z } from "zod";
import type { RobloxClient } from "../../core/roblox-client.js";

/**
 * Generic shape every MCP tool module exports. Inputs/outputs are typed via
 * Zod so we get runtime validation + JSON Schema generation + TS inference
 * for free.
 *
 * `handler` is async and receives:
 *  - `input`: already parsed + validated against `inputSchema`
 *  - `ctx`: shared dependencies (currently only the `RobloxClient`)
 *
 * Handlers must NOT swallow errors — let them bubble. The server-level
 * dispatcher catches them and runs them through `mapToMcpError` so the
 * response always conforms to the MCP error contract.
 */
export interface ToolContext {
  client: RobloxClient;
}

export interface ToolDefinition<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny,
> {
  /** MCP tool name. snake_case. Stable — used by agents to address tools. */
  name: string;
  /**
   * Description shown to the LLM in `tools/list`. Treat this as a prompt —
   * be explicit about when to use this tool vs related tools, what inputs
   * are required, and what fields come back.
   */
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  handler: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
}
