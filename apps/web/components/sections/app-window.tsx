import { MessageSquarePlus, Search, ArrowUp } from "lucide-react";
import { analyzeNiche, type NicheGameRow } from "@/lib/niche";
import { compact, int } from "@/lib/format";
import { GameAvatar } from "@/components/copilot/game-avatar";
import { BrandMark } from "@/components/brand-mark";

/**
 * AppWindow — the hero product surface: a macOS-Safari window framing the REAL
 * bloxscout agent (conversational: New chat + Conversations + an inline
 * niche-scan result). It runs a LIVE `analyzeNiche("tower defense")` at render
 * (ISR, page revalidate=1800) so the leaderboard shows real games with real
 * Roblox thumbnails — proof the product is reading live data, not a mockup.
 * Falls back to a curated static cohort if the live search is unavailable.
 */

const THREADS = [
  { title: "Is tower defense saturated?", active: true },
  { title: "Under-served simulator niches", active: false },
  { title: "What should I build next?", active: false },
  { title: "Brookhaven vs the RP genre", active: false },
];

const FALLBACK: NicheGameRow[] = [
  { universeId: 0, name: "Tower Defense Simulator", playing: 121000, creatorName: null, share: 0.44, description: "", thumbnailUrl: null },
  { universeId: 0, name: "Toilet Tower Defense", playing: 58000, creatorName: null, share: 0.21, description: "", thumbnailUrl: null },
  { universeId: 0, name: "Ultimate Tower Defense", playing: 27000, creatorName: null, share: 0.1, description: "", thumbnailUrl: null },
  { universeId: 0, name: "Anime Defenders", playing: 19000, creatorName: null, share: 0.07, description: "", thumbnailUrl: null },
  { universeId: 0, name: "All Star Tower Defense", playing: 14000, creatorName: null, share: 0.05, description: "", thumbnailUrl: null },
];

const VERDICT_LABEL: Record<string, string> = {
  open: "Open · room to win",
  contested: "Contested · room in the tail",
  locked: "Locked up · leader owns it",
  thin: "Thin market",
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export async function AppWindow() {
  const niche = await analyzeNiche("tower defense");
  const ok = niche.ok && niche.leaders.length >= 4;

  const leaders = (ok ? niche.leaders : FALLBACK).slice(0, 5);
  const maxShare = Math.max(0.0001, ...leaders.map((g) => g.share));
  const stats = ok
    ? {
        games: int(niche.gameCount),
        ccu: compact(niche.totalPlaying),
        top1: pct(niche.top1Share),
        top3: pct(niche.top3Share),
      }
    : { games: "30", ccu: "274k", top1: "44%", top3: "75%" };
  const verdict = ok
    ? (VERDICT_LABEL[niche.verdict] ?? "Contested")
    : "Contested · room in the tail";

  return (
    <div className="overflow-hidden rounded-xl border border-foreground/12 bg-background text-left shadow-[0_2px_0_0_rgba(23,23,29,0.02),0_60px_120px_-55px_rgba(23,23,29,0.5)]">
      {/* Safari chrome */}
      <div className="flex items-center gap-3 border-b border-foreground/10 bg-muted-surface px-4 py-2.5">
        <span className="flex gap-2" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <div className="mx-auto flex w-full max-w-xs items-center justify-center gap-1.5 rounded-md border border-foreground/10 bg-background px-3 py-1">
          <span className="font-mono text-[11px] text-foreground/45">
            bloxscout.app
          </span>
        </div>
        <span className="w-[52px]" aria-hidden />
      </div>

      <div className="flex min-h-[34rem]">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-foreground/10 bg-muted-surface/40 sm:flex">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 text-foreground">
            <BrandMark className="size-5" />
            <span className="text-[14px] font-medium tracking-[-0.01em]">
              bloxscout
            </span>
          </div>

          <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-foreground/10 bg-background px-2.5 py-1.5">
            <Search className="size-3.5 text-foreground/35" aria-hidden />
            <span className="text-[12px] text-foreground/40">Search</span>
            <span className="ml-auto rounded border border-foreground/12 px-1 font-mono text-[9px] text-foreground/40">
              ⌘K
            </span>
          </div>

          <div className="px-3 pb-3">
            <span className="flex w-full items-center gap-2 rounded-lg border border-foreground/12 bg-background px-3 py-2 text-[13px] font-medium text-foreground shadow-xs">
              <MessageSquarePlus className="size-4 text-accent" aria-hidden />
              New chat
            </span>
          </div>

          <p className="px-4 pb-1.5 font-mono text-[9px] tracking-[0.18em] text-foreground/40 uppercase">
            Conversations
          </p>
          <ul className="flex flex-col gap-0.5 px-2">
            {THREADS.map((t) => (
              <li
                key={t.title}
                className={`flex flex-col rounded-lg px-3 py-2 ${
                  t.active ? "bg-background shadow-xs" : ""
                }`}
              >
                <span
                  className={`truncate text-[13px] leading-tight ${
                    t.active
                      ? "font-medium text-foreground"
                      : "text-foreground/65"
                  }`}
                >
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-5 p-5 sm:p-7">
            {/* user message */}
            <div className="flex justify-end">
              <span className="rounded-2xl rounded-br-md bg-foreground px-4 py-2 text-[13.5px] text-background">
                is tower defense saturated?
              </span>
            </div>

            {/* agent reply */}
            <div className="flex flex-col gap-4">
              <p className="max-w-prose text-[13.5px] leading-relaxed text-foreground/80">
                Here is the live read. {stats.games} live games share{" "}
                <span className="font-medium text-foreground">
                  {stats.ccu} players
                </span>
                , and the leader holds {stats.top1}. I measured how concentrated
                the niche is and where the open room sits. The breakdown:
              </p>

              <NicheResult
                leaders={leaders}
                maxShare={maxShare}
                stats={stats}
                verdict={verdict}
              />
            </div>
          </div>

          {/* composer */}
          <div className="border-t border-foreground/10 px-5 py-3.5 sm:px-7">
            <div className="flex items-center gap-2 rounded-xl border border-foreground/12 bg-background px-3 py-2">
              <span className="flex-1 text-[12.5px] text-foreground/40">
                Ask about any niche, game, or trend…
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-foreground text-background">
                <ArrowUp className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NicheResult({
  leaders,
  maxShare,
  stats,
  verdict,
}: {
  leaders: NicheGameRow[];
  maxShare: number;
  stats: { games: string; ccu: string; top1: string; top3: string };
  verdict: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/12 bg-background shadow-xs">
      {/* header */}
      <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.16em] text-foreground uppercase">
          Tower defense · niche scan
        </span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-foreground/40 uppercase tabular-nums">
          {stats.games} games
        </span>
      </div>

      {/* verdict + stat tiles */}
      <div className="flex flex-col gap-3 px-4 py-4">
        <span className="inline-flex w-fit items-center rounded-md border border-accent/25 bg-accent/[0.08] px-2.5 py-1 text-[13px] font-medium text-accent">
          {verdict}
        </span>
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-foreground/10 bg-foreground/10">
          {[
            ["Live games", stats.games],
            ["Total CCU", stats.ccu],
            ["Top-1 share", stats.top1],
            ["Top-3 share", stats.top3],
          ].map(([label, value]) => (
            <div key={label} className="bg-background px-3 py-2.5">
              <p className="font-mono text-[8.5px] tracking-[0.14em] text-foreground/45 uppercase">
                {label}
              </p>
              <p className="tabular mt-1 text-[15px] font-medium text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* leaderboard */}
      <div className="border-t border-foreground/10 px-4 py-2 font-mono text-[9px] tracking-[0.16em] text-foreground/40 uppercase">
        Who&apos;s winning the niche now
      </div>
      <ul className="flex flex-col divide-y divide-foreground/[0.07]">
        {leaders.map((g, i) => (
          <li
            key={`${g.universeId}-${i}`}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <GameAvatar
              name={g.name}
              src={g.thumbnailUrl}
              className="size-8 rounded-md"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[13px] font-medium text-foreground">
                {g.name}
              </span>
              <span
                className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
                aria-hidden
              >
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(g.share / maxShare) * 100}%` }}
                />
              </span>
            </div>
            <div className="flex w-12 shrink-0 flex-col items-end">
              <span className="tabular text-[13px] font-medium text-foreground">
                {compact(g.playing)}
              </span>
              <span className="tabular font-mono text-[10px] text-foreground/45">
                {pct(g.share)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
