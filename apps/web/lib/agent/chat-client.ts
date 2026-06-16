"use client";

/**
 * The minimal copilot chat client. POSTs a turn to `/api/chat` (the Anthropic
 * agent loop), reads the NDJSON protocol body (`lib/agent/protocol.ts`), and
 * invokes callbacks as events arrive — `text-delta` for live prose, `tool-call`
 * for a running-tool hint, `tool-result` for an inline widget payload, plus
 * terminal `done`/`error`.
 *
 * We talk to our own route (not the Vercel AI SDK, not Anthropic from the
 * browser — the key stays server-side). This replaces the old assistant-ui
 * LocalRuntime adapter; the NDJSON line-framing logic is salvaged from it.
 */
import posthog from "posthog-js";
import { type ChatStreamEvent, citationSource } from "@/lib/agent/protocol";

/** A widget produced by a completed tool call, rendered inline in a turn. */
export interface ChatWidget {
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
  /** The tool inputs (for naming the citation, e.g. the query). */
  args?: unknown;
  /** Citation: short source label (e.g. "Live Roblox"). */
  source?: string;
  /** Citation: ISO timestamp the data was fetched. */
  fetchedAt?: string;
}

/** Prior turns sent to the route for context (the client owns thread state). */
export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Callbacks driven by the stream, in arrival order. */
export interface StreamHandlers {
  /** A chunk of assistant prose to append. */
  onTextDelta: (delta: string) => void;
  /** A chunk of model reasoning to append to the live thought block. */
  onThinkingDelta?: (delta: string) => void;
  /** The model invoked a tool (used for a subtle "running …" indicator). */
  onToolCall: (toolCallId: string, toolName: string) => void;
  /** A tool finished; push the widget payload. */
  onToolResult: (widget: ChatWidget) => void;
  /** A non-fatal error to surface in recon style. */
  onError: (message: string) => void;
  /** Free-tier daily quota hit (HTTP 429) — render an upgrade prompt, not an error. */
  onQuotaExceeded?: (info: {
    message: string;
    limit: number;
    used: number;
  }) => void;
  /** The turn completed (terminal `done` frame received). */
  onDone: () => void;
  /** The route returned/synced a conversation id (X-Conversation-Id header). */
  onConversationId?: (id: string) => void;
}

/**
 * Stream a single turn. `message` is the new user text; `history` the prior
 * turns. Resolves when the body is fully consumed. Throws `AbortError` when the
 * caller aborts (the Stop button); transport/HTTP errors are surfaced through
 * `onError` instead of throwing.
 */
export async function streamChat(
  {
    message,
    history,
    conversationId,
  }: {
    message: string;
    history: ChatTurn[];
    conversationId: string | null;
  },
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(posthog.__loaded
          ? { "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id() }
          : {}),
      },
      body: JSON.stringify({ conversationId, message, history }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    handlers.onError("The agent is unreachable.");
    return;
  }

  const convId = res.headers.get("X-Conversation-Id");
  if (convId) handlers.onConversationId?.(convId);

  if (!res.ok || !res.body) {
    let detail = "The agent is unavailable.";
    let payload: {
      error?: string;
      code?: string;
      limit?: number;
      used?: number;
    } = {};
    try {
      payload = (await res.json()) as typeof payload;
      if (payload.error) detail = payload.error;
    } catch {
      /* non-JSON body */
    }
    // Free-tier quota hit: route to the upgrade prompt when the caller wants it.
    if (
      res.status === 429 &&
      payload.code === "quota_exceeded" &&
      handlers.onQuotaExceeded
    ) {
      handlers.onQuotaExceeded({
        message: detail,
        limit: payload.limit ?? 0,
        used: payload.used ?? 0,
      });
      return;
    }
    handlers.onError(detail);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handle = (ev: ChatStreamEvent) => {
    switch (ev.type) {
      case "text-delta":
        handlers.onTextDelta(ev.text);
        break;
      case "thinking-delta":
        handlers.onThinkingDelta?.(ev.text);
        break;
      case "tool-call":
        handlers.onToolCall(ev.toolCallId, ev.toolName);
        break;
      case "tool-result":
        handlers.onToolResult({
          toolCallId: ev.toolCallId,
          toolName: ev.toolName,
          result: ev.result,
          isError: ev.isError,
          args: ev.args,
          source: citationSource(ev.toolName),
          fetchedAt: ev.fetchedAt,
        });
        break;
      case "error":
        handlers.onError(ev.message);
        break;
      case "done":
        handlers.onDone();
        break;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      // biome-ignore lint/suspicious/noAssignInExpressions: stream framing
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          handle(JSON.parse(line) as ChatStreamEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Stopped by the user — release the reader and re-throw for the caller.
      try {
        await reader.cancel();
      } catch {
        /* already closed */
      }
      throw err;
    }
    posthog.captureException(err, { context: "copilot_stream" });
    handlers.onError("The agent stream was interrupted.");
    return;
  }

  // Flush any trailing partial line.
  const tail = buffer.trim();
  if (tail) {
    try {
      handle(JSON.parse(tail) as ChatStreamEvent);
    } catch {
      /* ignore */
    }
  }
}
