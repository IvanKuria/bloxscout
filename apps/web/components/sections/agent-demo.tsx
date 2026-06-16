"use client";

/**
 * AgentDemo — a fully-scripted recreation of real bloxscout exchanges that
 * rotates through THREE of the agent's tools (revenue, competitors, niche
 * saturation). Crucially it renders the ACTUAL product widgets (RevenueCard,
 * CompetitorMap, NicheScan) with canned fixtures — so the marketing demo is
 * pixel-identical to the live agent and can never drift from it again.
 *
 * Each scene plays: a typed prompt → a brief think → a streamed one-line
 * verdict → the real widget. Scenes auto-advance and loop; the tab row lets you
 * jump between them (which pauses the rotation). prefers-reduced-motion shows a
 * scene fully resolved with no animation, and the tabs still switch it.
 */
import * as React from "react";
import { ArrowUp } from "lucide-react";
import { CompetitorMap } from "@/components/copilot/competitor-map";
import { NicheScan } from "@/components/copilot/niche-scan";
import { RevenueCard } from "@/components/copilot/revenue-card";
import type {
  CompetitorMapResult,
  NicheAnalysisResult,
  RevenueResult,
} from "@/lib/agent/tools";

// ── Fixtures — real shapes, realistic numbers (from live agent runs) ─────────

const REVENUE: RevenueResult = {
  ok: true,
  mode: "game",
  title: "Grow a Garden · revenue estimate",
  generatedAt: null,
  confidence: "low",
  assumptions: {
    conversionRate: 0.02,
    averageRobuxPerPayingUser: 100,
    daysActive: 30,
    rateUsdPerRobux: 0.0038,
  },
  disclaimer:
    "Heuristic estimate based on platform averages. Actual revenue varies by 5–10x depending on monetization design, gamepass pricing, and conversion.",
  game: {
    universeId: 7436755782,
    name: "Grow a Garden",
    genre: "Simulator",
    playing: 67334,
    estMonthlyUsd: 15352.15,
    estMonthlyRobux: 4040040,
    assumptionsOverridden: false,
    thumbnailUrl: null,
  },
};

const COMPETITORS: CompetitorMapResult = {
  ok: true,
  universeId: 994732206,
  anchorName: "Blox Fruits",
  totalPlaying: 651510,
  rows: [
    { universeId: 1, name: "RIVALS", playing: 250982, likeRatio: 0.94, totalVotes: 480000, creatorName: null, genre: null, thumbnailUrl: null },
    { universeId: 2, name: "Jujutsu Shenanigans", playing: 168383, likeRatio: 0.87, totalVotes: 220000, creatorName: null, genre: null, thumbnailUrl: null },
    { universeId: 3, name: "Kick a Lucky Block", playing: 105398, likeRatio: 0.96, totalVotes: 140000, creatorName: null, genre: null, thumbnailUrl: null },
    { universeId: 4, name: "The Strongest Battlegrounds", playing: 72537, likeRatio: 0.84, totalVotes: 610000, creatorName: null, genre: null, thumbnailUrl: null },
    { universeId: 5, name: "Anime Vanguards", playing: 54210, likeRatio: 0.9, totalVotes: 300000, creatorName: null, genre: null, thumbnailUrl: null },
  ],
};

const NICHE: NicheAnalysisResult = {
  ok: true,
  query: "tower defense",
  title: "Tower defense · niche scan",
  gameCount: 30,
  totalPlaying: 274000,
  top1Share: 0.44,
  top3Share: 0.75,
  hhi: 0.28,
  saturationScore: 58,
  verdict: "contested",
  whiteSpace: true,
  leaders: [
    { universeId: 1, name: "Tower Defense Simulator", playing: 121000, creatorName: null, share: 0.44, description: "", thumbnailUrl: null },
    { universeId: 2, name: "Toilet Tower Defense", playing: 58000, creatorName: null, share: 0.21, description: "", thumbnailUrl: null },
    { universeId: 3, name: "Ultimate Tower Defense", playing: 27000, creatorName: null, share: 0.1, description: "", thumbnailUrl: null },
    { universeId: 4, name: "Anime Defenders", playing: 19000, creatorName: null, share: 0.07, description: "", thumbnailUrl: null },
    { universeId: 5, name: "All Star Tower Defense", playing: 14000, creatorName: null, share: 0.05, description: "", thumbnailUrl: null },
  ],
  tailGames: 9,
};

interface Scene {
  tab: string;
  prompt: string;
  thinking: string;
  answer: string;
  widget: React.ReactNode;
}

const SCENES: Scene[] = [
  {
    tab: "Revenue",
    prompt: "how much does Grow a Garden make?",
    thinking: "running the revenue model · live CCU",
    answer:
      "Roughly $15k/month at ~67k live players — but read it as a band, not a number: real earnings swing 5–10× on monetization design.",
    widget: <RevenueCard result={REVENUE} />,
  },
  {
    tab: "Competitors",
    prompt: "who competes with Blox Fruits?",
    thinking: "reading Roblox's recommendation graph",
    answer:
      "Roblox's own graph places it next to battlegrounds and anime fighters. RIVALS leads the neighbourhood at 251k — and every rival's like-ratio is right there to judge.",
    widget: <CompetitorMap result={COMPETITORS} />,
  },
  {
    tab: "Saturation",
    prompt: "is tower defense saturated?",
    thinking: "scanning 30 live games · tower defense",
    answer:
      "Contested, not locked. The leader holds 44%, but a long tail of smaller titles still pulls real players — that tail is your white space.",
    widget: <NicheScan result={NICHE} />,
  },
];

type Phase = "typing" | "thinking" | "answering" | "done";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AgentDemo() {
  const [reduced] = React.useState(prefersReducedMotion);
  const [scene, setScene] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>(reduced ? "done" : "typing");
  const [typed, setTyped] = React.useState(reduced ? SCENES[0].prompt : "");
  const [streamed, setStreamed] = React.useState(reduced ? SCENES[0].answer : "");
  const [paused, setPaused] = React.useState(false);

  const current = SCENES[scene];

  // Jump to a scene (tab click) — pauses the auto-rotation.
  const jumpTo = React.useCallback(
    (i: number) => {
      setPaused(true);
      setScene(i);
      if (reduced) {
        setTyped(SCENES[i].prompt);
        setStreamed(SCENES[i].answer);
        setPhase("done");
      } else {
        setTyped("");
        setStreamed("");
        setPhase("typing");
      }
    },
    [reduced],
  );

  // Typing
  React.useEffect(() => {
    if (reduced || phase !== "typing") return;
    const prompt = SCENES[scene].prompt;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(prompt.slice(0, i));
      if (i >= prompt.length) {
        window.clearInterval(id);
        setPhase("thinking");
      }
    }, 45);
    return () => window.clearInterval(id);
  }, [reduced, phase, scene]);

  // Thinking
  React.useEffect(() => {
    if (phase !== "thinking") return;
    const id = window.setTimeout(() => setPhase("answering"), 950);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Answering (word stream)
  React.useEffect(() => {
    if (phase !== "answering") return;
    const words = SCENES[scene].answer.split(" ");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setStreamed(words.slice(0, i).join(" "));
      if (i >= words.length) {
        window.clearInterval(id);
        setPhase("done");
      }
    }, 38);
    return () => window.clearInterval(id);
  }, [phase, scene]);

  // Auto-advance to the next scene (unless paused / reduced)
  React.useEffect(() => {
    if (reduced || paused || phase !== "done") return;
    const id = window.setTimeout(() => {
      setScene((s) => (s + 1) % SCENES.length);
      setTyped("");
      setStreamed("");
      setPhase("typing");
    }, 3000);
    return () => window.clearTimeout(id);
  }, [reduced, paused, phase]);

  const showWidget = phase === "answering" || phase === "done";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-foreground/5">
      {/* window chrome + scene tabs */}
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            bloxscout agent
          </span>
        </div>
        <div className="flex items-center gap-1">
          {SCENES.map((s, i) => (
            <button
              key={s.tab}
              type="button"
              onClick={() => jumpTo(i)}
              className={`relative rounded-full px-2.5 py-1 text-[12px] transition-colors ${
                i === scene
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-[26rem] flex-col gap-4 px-4 py-5 sm:px-5">
        {/* user prompt */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-[13px] text-foreground">
            <span>{typed}</span>
            {phase === "typing" && (
              <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground/70" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {phase === "thinking" && (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
              </span>
              {current.thinking}
            </div>
          )}

          {showWidget && current.widget}

          {showWidget && (
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
      <div className="border-t border-border bg-muted px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
          <span className="flex-1 text-[12px] text-muted-foreground select-none">
            Ask about any niche, game, or trend…
          </span>
          <span
            className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-foreground"
            aria-hidden
          >
            <ArrowUp className="size-4" strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </div>
  );
}
