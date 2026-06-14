"use client";

/**
 * The reskinned assistant-ui Thread + Composer, styled to the recon console
 * theme. Design language:
 *   - Surface is the dark `bg-console` with the faint `.recon-grid`.
 *   - Mono uppercase micro-labels for every chrome element; the data widgets
 *     (rendered by the tool `render` map) are the decoration.
 *   - Exactly one accent (`--color-accent`); the live pulse dot is the only
 *     persistent motion. Message reveals use a single restrained fade-up,
 *     disabled under prefers-reduced-motion.
 *   - The composer is a clean minimal ask box: a borderless mono textarea on a
 *     raised surface with a single send affordance.
 */
import {
  ComposerPrimitive,
  MessagePrimitive,
  type TextMessagePartComponent,
  ThreadPrimitive,
  useThreadRuntime,
} from "@assistant-ui/react";
import { ArrowUp, Square } from "lucide-react";
import { CopilotToolWidgets } from "@/components/copilot/widgets";
import { cn } from "@/lib/utils";

/** Plain-text assistant/user prose. Light markdown-free styling. */
const MessageText: TextMessagePartComponent = ({ text }) => (
  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-console-foreground/90">
    {text}
  </p>
);

const SUGGESTIONS = [
  "Is tower defense saturated?",
  "What should I build right now?",
  "What's breaking out this week?",
  "Show me the top trending games",
];

function UserMessage() {
  return (
    <MessagePrimitive.Root
      className={cn(
        "ml-auto flex max-w-[85%] justify-end motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
      )}
    >
      <div className="rounded-2xl rounded-br-sm border border-console-border bg-white/[0.04] px-4 py-2.5">
        <MessagePrimitive.Parts components={{ Text: MessageText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex w-full max-w-full flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
        <span
          className="recon-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent"
          aria-hidden
        />
        bloxscout copilot
      </span>
      <div className="flex flex-col gap-4">
        <MessagePrimitive.Parts components={{ Text: MessageText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="relative flex items-end gap-2 rounded-2xl border border-console-border bg-black/30 px-3 py-2 transition-colors focus-within:border-accent/40">
      <ComposerPrimitive.Input
        autoFocus
        rows={1}
        placeholder="Ask about a niche, a genre, what to build…"
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 font-mono text-sm text-console-foreground outline-none placeholder:text-console-muted/70 field-sizing-content"
      />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp className="size-4" />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-console-border bg-white/[0.04] text-console-foreground transition-colors hover:bg-white/[0.08]"
          aria-label="Stop"
        >
          <Square className="size-3.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
}

function ThreadWelcome() {
  const runtime = useThreadRuntime();
  return (
    <ThreadPrimitive.Empty>
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            Recon copilot
          </span>
          <h1 className="font-heading text-2xl font-semibold leading-tight text-console-foreground sm:text-3xl">
            What are we building today?
          </h1>
          <p className="max-w-md font-mono text-xs leading-relaxed text-console-muted">
            Ask in plain language. The copilot reads bloxscout&apos;s live
            Roblox data and renders the answer as interactive widgets, inline.
          </p>
        </div>
        <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                runtime.append({
                  role: "user",
                  content: [{ type: "text", text: s }],
                })
              }
              className="rounded-xl border border-console-border bg-white/[0.02] px-4 py-3 text-left font-mono text-xs text-console-foreground/90 transition-colors hover:border-accent/40 hover:bg-white/[0.05]"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
}

export function CopilotThread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      {/* Registers the tool→widget renderers for this thread. */}
      <CopilotToolWidgets />

      <ThreadPrimitive.Viewport className="recon-grid flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
          <ThreadWelcome />
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      <div className="sticky bottom-0 border-t border-console-border bg-console/85 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <Composer />
          <p className="mt-2 text-center font-mono text-[10px] text-console-muted/70">
            Every figure traces to live bloxscout data · refreshed every 30 min
          </p>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}
