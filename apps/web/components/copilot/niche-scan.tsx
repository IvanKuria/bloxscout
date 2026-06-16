"use client";

/**
 * NicheScan · inline widget for `analyze_niche`.
 *
 * A LIVE niche competition scan: the verdict (open / contested / locked /
 * thin), the headline numbers (games, total CCU, top-1/top-3 dominance), and a
 * leaderboard of the matched games · each with its icon, a one-line
 * description, and its share of the niche's players. Calm near-monochrome
 * surface, soft borders, a single green accent; the verdict tone is the only
 * extra color signal.
 */
import Link from "next/link";
import type { NicheAnalysisResult, NicheGameRow, NicheVerdict } from "@/lib/agent/tools";
import { compact, int, slugify } from "@/lib/format";
import { GameAvatar } from "@/components/copilot/game-avatar";
import { cn } from "@/lib/utils";

const VERDICT: Record<
  NicheVerdict,
  { label: string; tone: "good" | "warn" | "bad" | "muted" }
> = {
  open: { label: "Open · room to win", tone: "good" },
  contested: { label: "Contested · a few big players", tone: "warn" },
  locked: { label: "Locked up · the leader owns it", tone: "bad" },
  thin: { label: "Thin market · little proven demand", tone: "muted" },
};

// Verdict chip colours — green when there's room, a neutral foreground when
// it's harder, muted when the market is thin.
const TONE_CHIP: Record<string, string> = {
  good: "border-positive/30 bg-positive/10 text-positive",
  warn: "border-border bg-muted text-foreground",
  bad: "border-border bg-muted text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <span className="block text-xs text-muted-foreground">
        {label}
      </span>
      <span className="tabular mt-1 block text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function LeaderRow({ g, maxShare }: { g: NicheGameRow; maxShare: number }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <GameAvatar name={g.name} src={g.thumbnailUrl} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/game/${g.universeId}/${slugify(g.name)}`}
          className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {g.name}
        </Link>
        {g.description ? (
          <span className="truncate text-xs text-muted-foreground">
            {g.description}
          </span>
        ) : null}
        <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(g.share / maxShare) * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
      <div className="flex w-16 shrink-0 flex-col items-end gap-0.5">
        <span className="tabular text-sm font-medium text-foreground">
          {compact(g.playing)}
        </span>
        <span className="tabular text-[11px] text-muted-foreground">
          {pct(g.share)}
        </span>
      </div>
    </li>
  );
}

export function NicheScan({ result }: { result: NicheAnalysisResult }) {
  const meta = VERDICT[result.verdict];
  const maxShare = Math.max(0.0001, ...result.leaders.map((g) => g.share));

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-primary"
            aria-hidden
          />
          <span className="text-sm font-medium text-foreground">
            {result.title}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Live scan
        </span>
      </div>

      {result.ok ? (
        <>
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2.5 py-1 text-[13px] font-medium",
                  TONE_CHIP[meta.tone],
                )}
              >
                {meta.label}
              </span>
              {result.whiteSpace ? (
                <span className="rounded-md border border-positive/30 bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive">
                  White space
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
              <Stat label="Live games" value={int(result.gameCount)} />
              <Stat label="Total CCU" value={compact(result.totalPlaying)} />
              <Stat label="Top-1 share" value={pct(result.top1Share)} />
              <Stat label="Top-3 share" value={pct(result.top3Share)} />
            </div>
          </div>

          <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            Who&apos;s winning the niche now
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {result.leaders.map((g) => (
              <LeaderRow key={g.universeId} g={g} maxShare={maxShare} />
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-2 px-4 py-4">
          {result.leaders.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {result.leaders.map((g) => (
                <li
                  key={g.universeId}
                  className="flex items-center gap-3 py-2.5"
                >
                  <GameAvatar name={g.name} src={g.thumbnailUrl} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {g.name}
                    </span>
                    {g.description ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {g.description}
                      </span>
                    ) : null}
                  </div>
                  <span className="tabular shrink-0 text-sm text-muted-foreground">
                    {compact(g.playing)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {result.note ? (
        <p className="border-t border-border bg-muted/40 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {result.note}
        </p>
      ) : null}
    </div>
  );
}
