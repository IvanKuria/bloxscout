"use client";

/**
 * The custom copilot chat client, styled to the recon console theme. Owns the
 * whole conversation in React state (no third-party runtime) and streams turns
 * via `lib/agent/chat-client.ts` (our NDJSON protocol over `/api/chat`).
 *
 * Design language:
 *   - Surface is the dark `bg-console` with the faint `.recon-grid`.
 *   - Mono uppercase micro-labels for every chrome element; the data widgets
 *     (rendered inline from the tool→widget map) are the decoration.
 *   - Exactly one accent (`--color-accent`); the live pulse dot is the only
 *     persistent motion. Message reveals use a single restrained fade-up,
 *     disabled under prefers-reduced-motion.
 *   - The composer is a clean minimal ask box: a borderless mono textarea on a
 *     raised surface with a single send/stop affordance.
 */
import { ArrowUp, Square } from "lucide-react";
import * as React from "react";
import {
  type ChatTurn,
  type ChatWidget,
  streamChat,
} from "@/lib/agent/chat-client";
import { renderWidget, WidgetRunning } from "@/components/copilot/widgets";

const SUGGESTIONS = [
  "Is tower defense saturated?",
  "What should I build right now?",
  "What's breaking out this week?",
  "Show me the top trending games",
];

interface UserTurn {
  id: string;
  role: "user";
  text: string;
}

interface AssistantTurn {
  id: string;
  role: "assistant";
  text: string;
  widgets: ChatWidget[];
  /** Tool currently executing (drives the running indicator); null when idle. */
  runningTool: string | null;
  /** A recon-styled error line, if the turn failed. */
  error: string | null;
}

type Message = UserTurn | AssistantTurn;

type Status = "idle" | "streaming";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Plain-text prose, whitespace preserved (markdown-free). */
function MessageText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-console-foreground/90">
      {text}
    </p>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto flex max-w-[85%] justify-end motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <div className="rounded-2xl rounded-br-sm border border-console-border bg-white/[0.04] px-4 py-2.5">
        <MessageText text={text} />
      </div>
    </div>
  );
}

function AssistantBubble({ turn }: { turn: AssistantTurn }) {
  return (
    <div className="flex w-full max-w-full flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
        <span
          className="recon-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent"
          aria-hidden
        />
        bloxscout copilot
      </span>
      <div className="flex flex-col gap-4">
        {turn.text ? <MessageText text={turn.text} /> : null}

        {turn.widgets.map((w) => {
          const node = renderWidget(w.toolName, w.result);
          return node ? <div key={w.toolCallId}>{node}</div> : null;
        })}

        {turn.runningTool ? (
          <WidgetRunning toolName={turn.runningTool} />
        ) : null}

        {turn.error ? (
          <p className="font-mono text-xs leading-relaxed text-accent">
            ⚠ {turn.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ThreadWelcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          Recon copilot
        </span>
        <h1 className="font-heading text-2xl font-semibold leading-tight text-console-foreground sm:text-3xl">
          What are we building today?
        </h1>
        <p className="max-w-md font-mono text-xs leading-relaxed text-console-muted">
          Ask in plain language. The copilot reads bloxscout&apos;s live Roblox
          data and renders the answer as interactive widgets, inline.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-console-border bg-white/[0.02] px-4 py-3 text-left font-mono text-xs text-console-foreground/90 transition-colors hover:border-accent/40 hover:bg-white/[0.05]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  status,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  status: Status;
}) {
  const streaming = status === "streaming";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming) onSend();
    }
  };

  return (
    <div className="relative flex items-end gap-2 rounded-2xl border border-console-border bg-black/30 px-3 py-2 transition-colors focus-within:border-accent/40">
      <textarea
        // biome-ignore lint/a11y/noAutofocus: focal point of the chat surface
        autoFocus
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about a niche, a genre, what to build…"
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 font-mono text-sm text-console-foreground outline-none placeholder:text-console-muted/70 field-sizing-content"
      />
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-console-border bg-white/[0.04] text-console-foreground transition-colors hover:bg-white/[0.08]"
        >
          <Square className="size-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={value.trim().length === 0}
          aria-label="Send"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  );
}

export function CopilotThread({
  initialConversationId = null,
}: {
  initialConversationId?: string | null;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [status, setStatus] = React.useState<Status>("idle");
  const [input, setInput] = React.useState("");

  const conversationIdRef = React.useRef<string | null>(initialConversationId);
  const abortRef = React.useRef<AbortController | null>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  // Keep the latest turn in view as content streams in.
  React.useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Abort any in-flight stream on unmount.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const updateAssistant = React.useCallback(
    (id: string, patch: (t: AssistantTurn) => AssistantTurn) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.role === "assistant" ? patch(m) : m,
        ),
      );
    },
    [],
  );

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "streaming") return;

      // Snapshot the prior turns for context BEFORE appending the new ones.
      const history: ChatTurn[] = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const userTurn: UserTurn = {
        id: nextId("user"),
        role: "user",
        text: trimmed,
      };
      const assistantId = nextId("assistant");
      const assistantTurn: AssistantTurn = {
        id: assistantId,
        role: "assistant",
        text: "",
        widgets: [],
        runningTool: null,
        error: null,
      };

      setMessages((prev) => [...prev, userTurn, assistantTurn]);
      setInput("");
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          {
            message: trimmed,
            history,
            conversationId: conversationIdRef.current,
          },
          {
            onConversationId: (id) => {
              conversationIdRef.current = id;
            },
            onTextDelta: (delta) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                text: t.text + delta,
              })),
            onToolCall: (_id, toolName) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: toolName,
              })),
            onToolResult: (widget) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: null,
                widgets: [...t.widgets, widget],
              })),
            onError: (message) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: null,
                error: message,
              })),
            onDone: () =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: null,
              })),
          },
          controller.signal,
        );
      } catch {
        // AbortError (Stop pressed) — clear the running indicator, keep partials.
        updateAssistant(assistantId, (t) => ({ ...t, runningTool: null }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStatus("idle");
      }
    },
    [messages, status, updateAssistant],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div
        ref={viewportRef}
        className="recon-grid flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
          {isEmpty ? (
            <ThreadWelcome onPick={(s) => void send(s)} />
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} text={m.text} />
              ) : (
                <AssistantBubble key={m.id} turn={m} />
              ),
            )
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-console-border bg-console/85 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => void send(input)}
            onStop={stop}
            status={status}
          />
          <p className="mt-2 text-center font-mono text-[10px] text-console-muted/70">
            Every figure traces to live bloxscout data · refreshed every 30 min
          </p>
        </div>
      </div>
    </div>
  );
}
