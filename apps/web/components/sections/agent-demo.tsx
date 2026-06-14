"use client";

/**
 * AgentDemo — a polished, fully-scripted recreation of a real bloxscout answer.
 *
 * This is NOT wired to the live agent: the homepage is unauthenticated, so we
 * replay a canned exchange ("is tower defense saturated?") with a typed prompt,
 * a streaming verdict, and a light-theme recreation of the niche-scan widget
 * (verdict, headline numbers, leaderboard with share bars). The numbers mirror
 * what the real `analyze_niche` tool returns for tower defense — ~30 live games,
 * TDS dominant at ~44% top-1 share, with tail games still pulling players, which
 * the agent reads as contested-but-with-white-space.
 *
 * Everything is timer-driven and respects prefers-reduced-motion.
 */
import * as React from "react";
import { ArrowUp } from "lucide-react";

const PROMPT = "is tower defense saturated?";

// Mirrors the real niche-scan shape for tower defense (illustrative figures).
const LEADERS = [
  { name: "Tower Defense Simulator", playing: "121k", share: 0.44, pct: 100 },
  { name: "Toilet Tower Defense", playing: "58k", share: 0.21, pct: 48 },
  { name: "Ultimate Tower Defense", playing: "27k", share: 0.1, pct: 22 },
  { name: "Anime Defenders", playing: "19k", share: 0.07, pct: 16 },
  { name: "All Star Tower Defense", playing: "14k", share: 0.05, pct: 12 },
];

const ANSWER =
  "Contested, but not locked. 30 live games, 274k players. Tower Defense Simulator alone holds 44% — yet 9 smaller titles are still pulling real CCU. That tail is your white space: a sharp twist on the format can win a slice without unseating the leader.";

type Phase = "typing" | "thinking" | "answering" | "done";

// Read the user's motion preference once, lazily, on the client. This is a
// "use client" component whose visuals are entirely timer-driven, so a static
// initial read is correct and avoids a synchronous setState inside an effect.
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AgentDemo() {
  const [reduced] = React.useState(prefersReducedMotion);
  const [typed, setTyped] = React.useState(reduced ? PROMPT : "");
  const [phase, setPhase] = React.useState<Phase>(reduced ? "done" : "typing");
  const [streamed, setStreamed] = React.useState(reduced ? ANSWER : "");

  // Drive the prompt typing. All state changes happen inside the interval
  // callback (an external system → React subscription), never synchronously.
  React.useEffect(() => {
    if (reduced || phase !== "typing") return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(PROMPT.slice(0, i));
      if (i >= PROMPT.length) {
        window.clearInterval(id);
        setPhase("thinking");
      }
    }, 55);
    return () => window.clearInterval(id);
  }, [reduced, phase]);

  // Thinking -> answering handoff.
  React.useEffect(() => {
    if (phase !== "thinking") return;
    const id = window.setTimeout(() => setPhase("answering"), 1100);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Stream the answer text word-by-word.
  React.useEffect(() => {
    if (phase !== "answering") return;
    const words = ANSWER.split(" ");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setStreamed(words.slice(0, i).join(" "));
      if (i >= words.length) {
        window.clearInterval(id);
        setPhase("done");
      }
    }, 42);
    return () => window.clearInterval(id);
  }, [phase]);

  const showWidget = phase === "answering" || phase === "done";

  return (
    <div className="relative">
      {/* soft glow behind the panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-8 -bottom-8 bg-[radial-gradient(60%_50%_at_70%_0%,rgba(226,35,26,0.10),transparent_70%)]"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_0_rgba(10,10,10,0.04),0_24px_60px_-28px_rgba(10,10,10,0.22)] ring-1 ring-foreground/[0.04]">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-border bg-muted-surface/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-accent font-mono text-[11px] leading-none font-bold text-accent-foreground">
              b
            </span>
            <span className="font-mono text-[11px] tracking-tight text-foreground">
              bloxscout agent
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-positive motion-reduce:animate-none"
              aria-hidden
            />
            live data
          </span>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
          {/* user prompt bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-3.5 py-2 text-[13px] text-foreground">
              <span className="font-mono">{typed}</span>
              {phase === "typing" && (
                <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground/70" />
              )}
            </div>
          </div>

          {/* agent response */}
          <div className="flex flex-col gap-3">
            {phase === "thinking" && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                </span>
                scanning 30 live games · tower defense
              </div>
            )}

            {showWidget && <NicheWidget />}

            {(phase === "answering" || phase === "done") && (
              <p className="text-[13px] leading-relaxed text-foreground/90">
                {streamed}
                {phase === "answering" && (
                  <span className="ml-px inline-block h-3.5 w-1 translate-y-0.5 animate-pulse bg-accent" />
                )}
              </p>
            )}
          </div>
        </div>

        {/* faux composer */}
        <div className="border-t border-border bg-muted-surface/40 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <span className="flex-1 font-mono text-[12px] text-muted-foreground/70 select-none">
              Ask about any niche, game, or trend…
            </span>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground"
              aria-hidden
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Light-theme recreation of the niche-scan widget. */
function NicheWidget() {
  const maxPct = Math.max(...LEADERS.map((l) => l.pct));
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted-surface/50 px-3.5 py-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-foreground uppercase">
          tower defense — niche scan
        </span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
          live scan
        </span>
      </div>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        <span className="inline-flex w-fit items-center gap-2 font-mono text-[11px] text-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#d98a00]" />
          Contested — a few big players
          <span className="rounded-sm bg-positive/12 px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-positive uppercase">
            White space
          </span>
        </span>
        <div className="grid grid-cols-4 gap-x-3 gap-y-2">
          {[
            ["games", "30"],
            ["total ccu", "274k"],
            ["top-1", "44%"],
            ["top-3", "75%"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                {label}
              </span>
              <span className="tabular font-mono text-sm text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3.5 py-1.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
        who&apos;s winning the niche now
      </div>
      <ul className="flex flex-col divide-y divide-border/70">
        {LEADERS.map((g) => (
          <li key={g.name} className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="w-40 shrink-0 truncate text-[12px] text-foreground">
              {g.name}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${(g.pct / maxPct) * 100}%` }}
                aria-hidden
              />
            </span>
            <span className="tabular w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {Math.round(g.share * 100)}%
            </span>
            <span className="tabular w-10 shrink-0 text-right font-mono text-[11px] text-foreground">
              {g.playing}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
