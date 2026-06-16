"use client";

/**
 * The AI agent's chat thread, built on the shadcn.io AI Elements.
 *
 * Owns one conversation's turns in React state and streams via
 * `lib/agent/chat-client.ts` (our NDJSON protocol over `/api/chat`). Assistant
 * turns are an ordered `parts` array (text / thinking / widget) so prose and
 * data widgets render in true production order. Presentation uses AI Elements:
 *   - Conversation: auto-scroll viewport
 *   - Message: user / assistant bubbles
 *   - Reasoning: the model's live "thinking" (collapsible)
 *   - Tool: each tool call as a card, our data widget rendered as its output
 *   - Sources: the "data cited" provenance footer
 *   - PromptInput / Suggestion: composer + welcome prompts
 */
import posthog from "posthog-js";
import * as React from "react";
import { Streamdown } from "streamdown";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai/conversation";
import { Loader } from "@/components/ai/loader";
import { Message, MessageContent } from "@/components/ai/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai/sources";
import { Suggestion } from "@/components/ai/suggestion";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/ai/tool";
import { renderWidget } from "@/components/copilot/widgets";
import {
  type ChatTurn,
  type ChatWidget,
  streamChat,
} from "@/lib/agent/chat-client";
import type { MessagePart } from "@/lib/agent/protocol";

const SUGGESTIONS = [
  "Is tower defense saturated?",
  "What should I build right now?",
  "What's breaking out this week?",
  "Show me the top trending games",
];

/** Friendly title per tool for the Tool card header. */
const TOOL_TITLE: Record<string, string> = {
  get_trending_games: "Trending games",
  get_breakout_games: "Breakout games",
  get_genre_saturation: "Genre saturation",
  get_rising_niches: "Rising niches",
  analyze_niche: "Niche scan",
  estimate_revenue: "Revenue estimate",
  get_game_quality: "Game quality",
  teardown_monetization: "Monetization teardown",
  map_competitors: "Competitor map",
  estimate_retention: "Retention proxy",
  get_game_details: "Game details",
  analyze_icon: "Icon analysis",
};
const toolTitle = (name: string) => TOOL_TITLE[name] ?? name;

interface UserTurn {
  id: string;
  role: "user";
  text: string;
}

/**
 * One ordered piece of an assistant turn. Text, thinking, and widgets interleave
 * in production order so prose renders below/between tables, never forced above.
 * Thinking is live-only (not persisted).
 */
type AssistantPart =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "widget"; widget: ChatWidget };

interface AssistantTurn {
  id: string;
  role: "assistant";
  parts: AssistantPart[];
  /** Tool currently executing (drives the running card); null when idle. */
  runningTool: string | null;
  /** True while this turn is actively streaming (drives the live thinking pulse). */
  streaming: boolean;
  /** An error line, if the turn failed. */
  error: string | null;
  /** Set when the free daily quota is hit — renders an upgrade prompt. */
  upsell: string | null;
}

type Message_ = UserTurn | AssistantTurn;

type Status = "idle" | "streaming";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/** Prose styling for streamed assistant markdown (token-driven, theme-safe). */
const PROSE = [
  "max-w-none text-[15px] leading-relaxed text-foreground",
  "[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5 [&_li]:marker:text-muted-foreground",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
].join(" ");

/** Relative "Xm ago" label from an ISO string (for citations). */
function timeAgo(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** A short query label from a tool call's args (query / gameName / genre). */
function citeQuery(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const a = args as Record<string, unknown>;
  const v = a.query ?? a.gameName ?? a.genre ?? a.niche;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Dedup citations (source + query) across a turn's widget parts. */
function citationsOf(widgets: ChatWidget[]): { label: string; when: string }[] {
  const seen = new Set<string>();
  const out: { label: string; when: string }[] = [];
  for (const w of widgets) {
    const q = citeQuery(w.args);
    const label = w.source ? (q ? `${w.source}: ${q}` : w.source) : w.toolName;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, when: timeAgo(w.fetchedAt) });
  }
  return out;
}

function AssistantTurnView({ turn }: { turn: AssistantTurn }) {
  const widgets = turn.parts.flatMap((p) =>
    p.kind === "widget" ? [p.widget] : [],
  );
  const cites = citationsOf(widgets);
  const lastIndex = turn.parts.length - 1;
  const showInitialLoader =
    turn.streaming && turn.parts.length === 0 && !turn.runningTool;

  return (
    <Message from="assistant">
      <MessageContent>
        {turn.parts.map((p, i) => {
          if (p.kind === "text") {
            return p.text ? (
              <Streamdown key={`t-${i}`} className={PROSE}>
                {p.text}
              </Streamdown>
            ) : null;
          }
          if (p.kind === "thinking") {
            return (
              <Reasoning
                key={`k-${i}`}
                isStreaming={turn.streaming && i === lastIndex}
              >
                <ReasoningTrigger />
                <ReasoningContent>{p.text}</ReasoningContent>
              </Reasoning>
            );
          }
          const w = p.widget;
          const node = renderWidget(w.toolName, w.result);
          return (
            <Tool key={w.toolCallId} defaultOpen>
              <ToolHeader
                className="group"
                title={toolTitle(w.toolName)}
                type={`tool-${w.toolName}`}
                state={w.isError ? "output-error" : "output-available"}
              />
              <ToolContent>
                {w.args && Object.keys(w.args as object).length > 0 ? (
                  <ToolInput input={w.args} />
                ) : null}
                {node ? (
                  <div className="p-3 pt-0">{node}</div>
                ) : w.isError ? (
                  <div className="px-4 pb-3 text-sm text-destructive">
                    This tool hit an error.
                  </div>
                ) : null}
              </ToolContent>
            </Tool>
          );
        })}

        {turn.runningTool ? (
          <Tool defaultOpen>
            <ToolHeader
              className="group"
              title={toolTitle(turn.runningTool)}
              type={`tool-${turn.runningTool}`}
              state="input-available"
            />
          </Tool>
        ) : null}

        {showInitialLoader ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader size={16} />
            Thinking…
          </div>
        ) : null}

        {turn.error ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span aria-hidden>⚠</span>
            {turn.error}
          </p>
        ) : null}

        {turn.upsell ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3.5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                Daily limit reached
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {turn.upsell}
              </p>
            </div>
            <a
              href="/app"
              onClick={() => posthog.capture("quota_upsell_clicked")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Upgrade to Pro
            </a>
          </div>
        ) : null}

        {!turn.streaming && cites.length > 0 ? (
          <Sources>
            <SourcesTrigger count={cites.length}>
              <span className="font-medium">Data cited ({cites.length})</span>
            </SourcesTrigger>
            <SourcesContent>
              {cites.map((c) => (
                <Source key={c.label} href="#">
                  <span className="text-muted-foreground">
                    {c.label}
                    {c.when ? ` · ${c.when}` : ""}
                  </span>
                </Source>
              ))}
            </SourcesContent>
          </Sources>
        ) : null}
      </MessageContent>
    </Message>
  );
}

function ThreadWelcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          What are we building today?
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Ask in plain language. The agent reads bloxscout&apos;s live Roblox
          data and answers with grounded, interactive widgets.
        </p>
      </div>
      <div className="flex max-w-xl flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Suggestion
            key={s}
            suggestion={s}
            onClick={(text) => {
              posthog.capture("chat_suggestion_clicked", { suggestion: text });
              onPick(text);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Map persisted/hydrated MessageParts to the client's ordered AssistantParts. */
function partsToClient(parts: MessagePart[]): AssistantPart[] {
  return parts.map((p) =>
    p.kind === "text"
      ? { kind: "text", text: p.text }
      : {
          kind: "widget",
          widget: {
            toolCallId: p.toolCallId,
            toolName: p.toolName,
            result: p.result,
            isError: p.isError,
            args: p.args,
            source: p.source,
            fetchedAt: p.fetchedAt,
          },
        },
  );
}

/** Flatten a message's prose (for the text-only history sent for context). */
function messageText(m: Message_): string {
  if (m.role === "user") return m.text;
  return m.parts
    .filter((p): p is { kind: "text"; text: string } => p.kind === "text")
    .map((p) => p.text)
    .join("\n\n");
}

/** Append a streaming text/thinking delta to the trailing same-kind part. */
function appendStreamText(
  parts: AssistantPart[],
  kind: "text" | "thinking",
  delta: string,
): AssistantPart[] {
  const last = parts[parts.length - 1];
  if (last && last.kind !== "widget" && last.kind === kind) {
    const merged: AssistantPart =
      kind === "text"
        ? { kind: "text", text: last.text + delta }
        : { kind: "thinking", text: last.text + delta };
    return [...parts.slice(0, -1), merged];
  }
  const fresh: AssistantPart =
    kind === "text"
      ? { kind: "text", text: delta }
      : { kind: "thinking", text: delta };
  return [...parts, fresh];
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
  const [messages, setMessages] = React.useState<Message_[]>([]);
  const [status, setStatus] = React.useState<Status>("idle");
  const [hydrating, setHydrating] = React.useState<boolean>(
    Boolean(conversationId),
  );

  const conversationIdRef = React.useRef<string | null>(conversationId);
  const abortRef = React.useRef<AbortController | null>(null);

  // Hydrate a saved thread on open / when the id changes. Keyed upstream, so a
  // fresh chat mounts empty and never enters the fetch path below.
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
            parts: MessagePart[];
          }>;
        };
        if (cancelled) return;
        const hydrated: Message_[] = data.messages.map((m) =>
          m.role === "user"
            ? { id: m.id, role: "user", text: m.text }
            : {
                id: m.id,
                role: "assistant",
                parts: partsToClient(m.parts ?? []),
                runningTool: null,
                streaming: false,
                error: null,
                upsell: null,
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

      posthog.capture("chat_message_sent", {
        length: trimmed.length,
        conversationId: conversationIdRef.current,
      });

      const wasFresh = conversationIdRef.current === null;

      const history: ChatTurn[] = messages.map((m) => ({
        role: m.role,
        text: messageText(m),
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
        parts: [],
        runningTool: null,
        streaming: true,
        error: null,
        upsell: null,
      };

      setMessages((prev) => [...prev, userTurn, assistantTurn]);
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
                parts: appendStreamText(t.parts, "text", delta),
              })),
            onThinkingDelta: (delta) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                parts: appendStreamText(t.parts, "thinking", delta),
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
                parts: [...t.parts, { kind: "widget", widget }],
              })),
            onError: (message) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: null,
                streaming: false,
                error: message,
              })),
            onQuotaExceeded: (info) =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: null,
                streaming: false,
                upsell: info.message,
              })),
            onDone: () =>
              updateAssistant(assistantId, (t) => ({
                ...t,
                runningTool: null,
                streaming: false,
              })),
          },
          controller.signal,
        );
      } catch {
        updateAssistant(assistantId, (t) => ({
          ...t,
          runningTool: null,
          streaming: false,
        }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStatus("idle");
      }
    },
    [
      messages,
      status,
      updateAssistant,
      onConversationCreated,
      onTitle,
      onFirstMessage,
    ],
  );

  const stop = React.useCallback(() => {
    posthog.capture("chat_stopped");
    abortRef.current?.abort();
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {isEmpty && !hydrating ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <ThreadWelcome onPick={(s) => void send(s)} />
        </div>
      ) : (
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {hydrating
              ? [0, 1].map((i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
                  </div>
                ))
              : messages.map((m) =>
                  m.role === "user" ? (
                    <Message key={m.id} from="user">
                      <MessageContent>
                        <span className="whitespace-pre-wrap">{m.text}</span>
                      </MessageContent>
                    </Message>
                  ) : (
                    <AssistantTurnView key={m.id} turn={m} />
                  ),
                )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="border-t border-border bg-background/85 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <PromptInput
            onSubmit={(msg) => {
              if (status === "streaming") {
                stop();
                return;
              }
              const t = (msg.text ?? "").trim();
              if (t) void send(t);
            }}
          >
            <PromptInputTextarea placeholder="Ask about a niche, a genre, what to build…" />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status === "streaming" ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Every figure traces to live bloxscout data, refreshed every 30 min
          </p>
        </div>
      </div>
    </div>
  );
}
