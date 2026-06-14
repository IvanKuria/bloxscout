"use client";

/**
 * The AI agent's chat thread — light, airy, production-grade.
 *
 * Owns one conversation's turns in React state and streams via
 * `lib/agent/chat-client.ts` (our NDJSON protocol over `/api/chat`). The data
 * widgets (rendered inline from the tool→widget map) are the visual texture;
 * everything else stays clean white surface + hairline borders + one red accent.
 *
 * Assistant prose renders through <Streamdown> (real markdown — no raw `**`);
 * user prose is plain. On open it hydrates a saved thread (text + widgets) from
 * `/api/conversations/[id]`, and reports a newly-created thread id + first-line
 * title up to the sidebar via callbacks.
 */
import { ArrowUp, Square } from "lucide-react";
import * as React from "react";
import { Streamdown } from "streamdown";
import {
  type ChatTurn,
  type ChatWidget,
  streamChat,
} from "@/lib/agent/chat-client";
import type { WidgetPayload } from "@/lib/agent/store";
import { renderWidget, WidgetRunning } from "@/components/copilot/widgets";

const SUGGESTIONS = [
  {
    label: "Is tower defense saturated?",
    hint: "Live competition scan of a niche",
  },
  {
    label: "What should I build right now?",
    hint: "Rising niches grounded in momentum",
  },
  {
    label: "What's breaking out this week?",
    hint: "Fastest-accelerating games",
  },
  {
    label: "Show me the top trending games",
    hint: "Ranked by live concurrent players",
  },
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
  /** An error line, if the turn failed. */
  error: string | null;
}

type Message = UserTurn | AssistantTurn;

type Status = "idle" | "streaming";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/** Light-theme prose styling for streamed assistant markdown. */
const PROSE = [
  "max-w-none text-[15px] leading-relaxed text-foreground/90",
  "[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-hover",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5 [&_li]:marker:text-muted-foreground",
  "[&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_code]:rounded [&_code]:bg-muted-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted-surface [&_pre]:p-3",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
].join(" ");

function AssistantProse({ text }: { text: string }) {
  return (
    <div className={PROSE}>
      <Streamdown>{text}</Streamdown>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-auto flex max-w-[85%] justify-end motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <div className="rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-background">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ turn }: { turn: AssistantTurn }) {
  return (
    <div className="flex w-full max-w-full flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span
          className="recon-pulse inline-block size-1.5 rounded-full bg-accent"
          aria-hidden
        />
        bloxscout agent
      </span>
      <div className="flex flex-col gap-4">
        {turn.text ? <AssistantProse text={turn.text} /> : null}

        {turn.widgets.map((w) => {
          const node = renderWidget(w.toolName, w.result);
          return node ? <div key={w.toolCallId}>{node}</div> : null;
        })}

        {turn.runningTool ? (
          <WidgetRunning toolName={turn.runningTool} />
        ) : null}

        {turn.error ? (
          <p className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
            <span aria-hidden>⚠</span>
            {turn.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ThreadWelcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground shadow-xs">
          <span
            className="recon-pulse inline-block size-1.5 rounded-full bg-accent"
            aria-hidden
          />
          bloxscout agent
        </span>
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          What are we building today?
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Ask in plain language. The agent reads bloxscout&apos;s live Roblox
          data and renders the answer as interactive widgets, inline.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.label)}
            className="group flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
          >
            <span className="text-sm font-medium text-foreground">
              {s.label}
            </span>
            <span className="text-xs text-muted-foreground">{s.hint}</span>
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
    <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
      <textarea
        // biome-ignore lint/a11y/noAutofocus: focal point of the chat surface
        autoFocus
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about a niche, a genre, what to build…"
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground field-sizing-content"
      />
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted-surface"
        >
          <Square className="size-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={value.trim().length === 0}
          aria-label="Send"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-all hover:bg-accent-hover disabled:opacity-40"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Adapt a stored widget payload to the inline `ChatWidget` shape. */
function toChatWidget(w: WidgetPayload): ChatWidget {
  return {
    toolCallId: w.toolCallId,
    toolName: w.toolName,
    result: w.result,
    isError: w.isError,
  };
}

export function CopilotThread({
  conversationId = null,
  onConversationCreated,
  onTitle,
  onFirstMessage,
}: {
  /** The thread to load. Null = a fresh chat. */
  conversationId?: string | null;
  /** Fired with the server-assigned id when a fresh chat sends its first turn. */
  onConversationCreated?: (id: string) => void;
  /** Reports the derived title for the sidebar after the first turn. */
  onTitle?: (id: string, title: string) => void;
  /** Fired when the very first user message is sent (for optimistic sidebar). */
  onFirstMessage?: (text: string) => void;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [status, setStatus] = React.useState<Status>("idle");
  const [input, setInput] = React.useState("");
  const [hydrating, setHydrating] = React.useState<boolean>(
    Boolean(conversationId),
  );

  const conversationIdRef = React.useRef<string | null>(conversationId);
  const abortRef = React.useRef<AbortController | null>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  // Hydrate a saved thread (text + widgets) on open / when the id changes.
  // The component is keyed by conversationId upstream, so a fresh chat mounts
  // with empty state and never enters the fetch path below.
  React.useEffect(() => {
    conversationIdRef.current = conversationId;
    if (!conversationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as {
          messages: Array<{
            id: string;
            role: "user" | "assistant";
            text: string;
            widgets: WidgetPayload[];
          }>;
        };
        if (cancelled) return;
        const hydrated: Message[] = data.messages.map((m) =>
          m.role === "user"
            ? { id: m.id, role: "user", text: m.text }
            : {
                id: m.id,
                role: "assistant",
                text: m.text,
                widgets: (m.widgets ?? []).map(toChatWidget),
                runningTool: null,
                error: null,
              },
        );
        setMessages(hydrated);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

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

      const wasFresh = conversationIdRef.current === null;

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
      if (wasFresh) onFirstMessage?.(trimmed);

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
              const created = conversationIdRef.current === null;
              conversationIdRef.current = id;
              if (created) {
                onConversationCreated?.(id);
                onTitle?.(id, trimmed);
              }
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
    [messages, status, updateAssistant, onConversationCreated, onTitle, onFirstMessage],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-background">
      <div ref={viewportRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-4 py-8">
          {hydrating ? (
            <div className="flex flex-col gap-6">
              {[0, 1].map((i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted-surface" />
                  <div className="h-20 w-full animate-pulse rounded-xl bg-muted-surface" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
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

      <div className="border-t border-border bg-background/85 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => void send(input)}
            onStop={stop}
            status={status}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Every figure traces to live bloxscout data · refreshed every 30 min
          </p>
        </div>
      </div>
    </div>
  );
}
