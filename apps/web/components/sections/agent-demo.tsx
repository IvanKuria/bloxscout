"use client";

/**
 * AgentDemo — a polished, fully-scripted recreation of a real bloxscout answer,
 * restyled monochrome in the twenty.com idiom. Replays a canned exchange ("is
 * tower defense saturated?"): a typed prompt, a brief think, a streamed verdict,
 * and a light/monochrome recreation of the niche-scan widget (verdict, headline
 * read-outs, ranked TEXT leaderboard with thin share bars — no icons).
 *
 * Everything is timer-driven and respects prefers-reduced-motion (shown resolved
 * immediately). SSR-safe: no window access at render.
 */
import * as React from "react";
import { ArrowUp } from "lucide-react";

const PROMPT = "is tower defense saturated?";

const LEADERS = [
  { name: "Tower Defense Simulator", playing: "121k", share: 44, pct: 100 },
  { name: "Toilet Tower Defense", playing: "58k", share: 21, pct: 48 },
  { name: "Ultimate Tower Defense", playing: "27k", share: 10, pct: 22 },
  { name: "Anime Defenders", playing: "19k", share: 7, pct: 16 },
  { name: "All Star Tower Defense", playing: "14k", share: 5, pct: 12 },
];

const ANSWER =
  "Contested, but not locked. 30 live games, 274k players. Tower Defense Simulator alone holds 44%, yet 9 smaller titles are still pulling real CCU. That tail is your white space: a sharp twist on the format can win a slice without unseating the leader.";

type Phase = "typing" | "thinking" | "answering" | "done";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AgentDemo() {
  const [reduced] = React.useState(prefersReducedMotion);
  const [typed, setTyped] = React.useState(reduced ? PROMPT : "");
  const [phase, setPhase] = React.useState<Phase>(reduced ? "done" : "typing");
  const [streamed, setStreamed] = React.useState(reduced ? ANSWER : "");

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

  React.useEffect(() => {
    if (phase !== "thinking") return;
    const id = window.setTimeout(() => setPhase("answering"), 1100);
    return () => window.clearTimeout(id);
  }, [phase]);

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
      <div className="relative overflow-hidden rounded-lg border border-foreground/12 bg-background shadow-[0_1px_0_0_rgba(28,28,28,0.03),0_30px_70px_-40px_rgba(28,28,28,0.3)]">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-foreground/10 bg-muted-surface px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full border border-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full border border-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full border border-foreground/15" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-foreground/45 uppercase">
              bloxscout agent
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
          {/* user prompt */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-md border border-foreground/10 bg-muted-surface px-3.5 py-2 text-[13px] text-foreground">
              <span className="font-mono">{typed}</span>
              {phase === "typing" && (
                <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground/70" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {phase === "thinking" && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-foreground/55">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
                </span>
                scanning 30 live games · tower defense
              </div>
            )}

            {showWidget && <NicheWidget />}

            {(phase === "answering" || phase === "done") && (
              <p className="text-[13px] leading-relaxed text-foreground/85">
                {streamed}
                {phase === "answering" && (
                  <span className="ml-px inline-block h-3.5 w-1 translate-y-0.5 animate-pulse bg-foreground" />
                )}
              </p>
            )}
          </div>
        </div>

        {/* faux composer */}
        <div className="border-t border-foreground/10 bg-muted-surface px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2">
            <span className="flex-1 font-mono text-[12px] text-foreground/40 select-none">
              Ask about any niche, game, or trend…
            </span>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded bg-foreground text-background"
              aria-hidden
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Monochrome recreation of the niche-scan widget. */
function NicheWidget() {
  const maxPct = Math.max(...LEADERS.map((l) => l.pct));
  return (
    <div className="overflow-hidden rounded-md border border-foreground/10 bg-background">
      <div className="flex items-center justify-between border-b border-foreground/10 bg-muted-surface px-3.5 py-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-foreground uppercase">
          Tower defense · niche scan
        </span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-foreground/45 uppercase tabular-nums">
          30 games
        </span>
      </div>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/25 bg-accent/[0.08] px-2.5 py-1 text-[13px] font-medium tracking-[-0.01em] text-accent">
          Contested · white space in the tail
        </span>
        <div className="grid grid-cols-4 gap-x-3 gap-y-2">
          {[
            ["games", "30"],
            ["total ccu", "274k"],
            ["top-1", "44%"],
            ["top-3", "75%"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="font-mono text-[9px] tracking-[0.14em] text-foreground/45 uppercase">
                {label}
              </span>
              <span className="tabular font-mono text-sm text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-foreground/10 px-3.5 py-1.5 font-mono text-[9px] tracking-[0.14em] text-foreground/40 uppercase">
        who&apos;s winning the niche now
      </div>
      <ul className="flex flex-col divide-y divide-foreground/[0.07]">
        {LEADERS.map((g) => (
          <li key={g.name} className="flex items-center gap-2.5 px-3.5 py-2">
            <span className="w-40 shrink-0 truncate text-[12px] text-foreground/80">
              {g.name}
            </span>
            <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/10">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${(g.pct / maxPct) * 100}%` }}
                aria-hidden
              />
            </span>
            <span className="tabular w-9 shrink-0 text-right font-mono text-[11px] text-foreground/55">
              {g.share}%
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
