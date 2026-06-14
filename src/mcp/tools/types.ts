import type { HostedDataClient } from "@bloxscout/core/hosted-data";
import type { RobloxClient } from "@bloxscout/core/roblox-client";
import type { SnapshotStore } from "@bloxscout/core/snapshots";
import type { z } from "zod";

/**
 * Generic shape every MCP tool module exports. Inputs/outputs are typed via
 * Zod so we get runtime validation + JSON Schema generation + TS inference
 * for free.
 *
 * `handler` is async and receives:
 *  - `input`: already parsed + validated against `inputSchema`
 *  - `ctx`: shared dependencies — the Roblox client and (optionally) the
 *           local snapshot store
 *
 * Handlers must NOT swallow errors — let them bubble. The server-level
 * dispatcher catches them and runs them through `mapToMcpError` so the
 * response always conforms to the MCP error contract.
 */
export interface ToolContext {
  client: RobloxClient;
  /**
   * Local SQLite snapshot store. Required by the time-series tools
   * (`snapshot_game`, `get_game_history`, `get_up_and_coming`, `watch_games`);
   * ignored by everything else. Optional so unit tests for non-storage tools
   * don't need to construct one.
   */
  store?: SnapshotStore;
  /**
   * Read client for the hosted `bloxscout-data` dataset. Strictly additive:
   * tools must degrade to their live/local behavior when it's absent or any
   * of its methods return `null`. Optional so unit tests and
   * `BLOXSCOUT_NO_HOSTED=1` builds simply don't construct one.
   */
  hosted?: HostedDataClient;
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
