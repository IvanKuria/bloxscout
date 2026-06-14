"use client";

/**
 * The LocalRuntime `ChatModelAdapter` for the copilot. It POSTs the
 * conversation to `/api/chat` (the Anthropic agent loop), reads the NDJSON
 * protocol stream, and yields cumulative assistant `content` — text parts plus
 * `tool-call` parts (with their `result` merged in) — which assistant-ui maps
 * to the inline widgets via the toolkit `render` map.
 *
 * We talk to our own route (not the Vercel AI SDK and not Anthropic directly
 * from the browser — the key stays server-side).
 */
import type {
  ChatModelAdapter,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import type { ChatStreamEvent } from "@/lib/agent/protocol";

/** Flatten an assistant-ui message's parts to plain text for the wire. */
function flattenText(message: {
  content: readonly { type: string; text?: string }[];
}): string {
  return message.content
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

/** A mutable tool-call part we build up as events arrive. */
interface MutableToolCall {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  argsText: string;
  result?: unknown;
  isError?: boolean;
}

/**
 * Builds the copilot adapter. It owns its own conversation-id state internally
 * (seeded from `initialConversationId`, then synced from the route's
 * `X-Conversation-Id` header) so the React layer never has to thread a ref
 * through render.
 */
export function createCopilotAdapter(
  initialConversationId: string | null = null,
): ChatModelAdapter {
  let conversationId = initialConversationId;
  return {
    async *run({ messages, abortSignal }) {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          text: flattenText(m),
        }))
        .filter((m) => m.text.length > 0);

      // The last user message is the new turn; the rest is context.
      const last = history[history.length - 1];
      const priorHistory = history.slice(0, -1);
      const message = last?.role === "user" ? last.text : "";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message,
          history: priorHistory,
        }),
        signal: abortSignal,
      });

      const convId = res.headers.get("X-Conversation-Id");
      if (convId) conversationId = convId;

      if (!res.ok || !res.body) {
        let detail = "The copilot is unavailable.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) detail = j.error;
        } catch {
          /* non-JSON body */
        }
        yield { content: [{ type: "text", text: `⚠ ${detail}` }] };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      const toolCalls = new Map<string, MutableToolCall>();

      const snapshot = () => {
        const parts: Array<
          { type: "text"; text: string } | ToolCallMessagePart
        > = [];
        if (text) parts.push({ type: "text", text });
        for (const tc of toolCalls.values()) {
          parts.push({
            type: "tool-call",
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args,
            argsText: tc.argsText,
            ...(tc.result !== undefined ? { result: tc.result } : {}),
            ...(tc.isError !== undefined ? { isError: tc.isError } : {}),
          } as ToolCallMessagePart);
        }
        return { content: parts };
      };

      const handle = (ev: ChatStreamEvent) => {
        switch (ev.type) {
          case "text-delta":
            text += ev.text;
            break;
          case "tool-call":
            toolCalls.set(ev.toolCallId, {
              type: "tool-call",
              toolCallId: ev.toolCallId,
              toolName: ev.toolName,
              args: (ev.args as Record<string, unknown>) ?? {},
              argsText: JSON.stringify(ev.args ?? {}),
            });
            break;
          case "tool-result": {
            const tc = toolCalls.get(ev.toolCallId);
            if (tc) {
              tc.result = ev.result;
              tc.isError = ev.isError;
            }
            break;
          }
          case "error":
            text += `\n\n⚠ ${ev.message}`;
            break;
          case "done":
            break;
        }
      };

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
        yield snapshot();
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
      yield snapshot();
    },
  };
}
