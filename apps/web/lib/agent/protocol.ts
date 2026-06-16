/**
 * The newline-delimited JSON wire protocol between `/api/chat` (server agent
 * loop) and the LocalRuntime `ChatModelAdapter` (client). Plain types, no env,
 * no server-only — imported by both sides so the contract can't drift.
 *
 * Each line of the streamed body is one JSON object of `ChatStreamEvent`. The
 * adapter accumulates these into assistant message `content` parts that
 * assistant-ui renders (text + tool-call parts → inline widgets).
 */

/** A chat turn as sent from the client to the server. */
export interface WireMessage {
  role: "user" | "assistant";
  /** Flattened plain-text content of the turn (widgets are re-derived). */
  text: string;
}

export type ChatStreamEvent =
  /** Incremental assistant prose. `text` is the new chunk to append. */
  | { type: "text-delta"; text: string }
  /** Incremental model reasoning (adaptive thinking), shown as a thought block. */
  | { type: "thinking-delta"; text: string }
  /** The model invoked a tool. `args` are the parsed inputs. */
  | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
  /** The tool finished; `result` is the widget payload. `fetchedAt` grounds the citation. */
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      args?: unknown;
      result: unknown;
      isError?: boolean;
      fetchedAt?: string;
    }
  /** Terminal frame; the turn is complete. */
  | { type: "done" }
  /** Non-fatal error to surface to the user. */
  | { type: "error"; message: string };

/** Serialize one event as a protocol line (newline-terminated). */
export function encodeEvent(ev: ChatStreamEvent): string {
  return `${JSON.stringify(ev)}\n`;
}

/**
 * A persisted/hydrated piece of an assistant turn, in production order. Text and
 * widgets interleave exactly as the model produced them (so prose can sit below
 * or between tables, never forced above). Thinking is NOT persisted.
 */
export type MessagePart =
  | { kind: "text"; text: string }
  | {
      kind: "widget";
      toolCallId: string;
      toolName: string;
      args?: unknown;
      result: unknown;
      isError?: boolean;
      /** Citation: short human source label (e.g. "Live Roblox"). */
      source?: string;
      /** Citation: ISO timestamp the data was fetched. */
      fetchedAt?: string;
    };

/** Short, human source label per tool — powers the "Data cited" footer. */
const CITATION_SOURCE: Record<string, string> = {
  get_trending_games: "bloxscout rankings",
  get_breakout_games: "bloxscout rankings",
  get_genre_saturation: "bloxscout analytics",
  get_rising_niches: "bloxscout analytics",
  analyze_niche: "Live Roblox search",
  estimate_revenue: "Heuristic estimate",
  get_game_quality: "Live Roblox votes",
  teardown_monetization: "Live Roblox catalog",
  map_competitors: "Roblox recommendation graph",
  estimate_retention: "Roblox badge data",
  get_game_details: "Live Roblox + bloxscout history",
  analyze_icon: "Vision analysis",
  get_replication_radar: "Steam store + reviews",
  analyze_replication_target: "Steam store + reviews",
};

/** Resolve a tool's citation source label (falls back to a generic). */
export function citationSource(toolName: string): string {
  return CITATION_SOURCE[toolName] ?? "bloxscout data";
}
