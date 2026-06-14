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
  /** The model invoked a tool. `args` are the parsed inputs. */
  | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
  /** The tool finished; `result` is the widget payload. */
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError?: boolean;
    }
  /** Terminal frame; the turn is complete. */
  | { type: "done" }
  /** Non-fatal error to surface to the user. */
  | { type: "error"; message: string };

/** Serialize one event as a protocol line (newline-terminated). */
export function encodeEvent(ev: ChatStreamEvent): string {
  return `${JSON.stringify(ev)}\n`;
}
