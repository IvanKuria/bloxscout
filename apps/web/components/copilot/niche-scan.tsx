"use client";

/**
 * NicheScan — inline widget for `analyze_niche`.
 *
 * Renders a LIVE niche competition scan: the verdict (open / contested /
 * locked / thin), the headline numbers (games, total CCU, top-1 dominance),
 * and a leaderboard of the actual matched games with their share of the
 * niche's players. Recon-themed; the verdict colour is the single accent.
 */
import Link from "next/link";
import * as React from "react";
import type { NicheAnalysisResult, NicheVerdict } from "@/lib/agent/tools";
import { compact, int, slugify } from "@/lib/format";

const POSITIVE = "#1faa6b";
const ACCENT = "#e2231a";

const VERDICT: Record<
  NicheVerdict,
  { label: string; tone: "good" | "warn" | "bad" | "muted" }
> = {
  open: { label: "Open — room to win", tone: "good" },
  contested: { label: "Contested — a few big players", tone: "warn" },
  locked: { label: "Locked up — the leader owns it", tone: "bad" },
  thin: { label: "Thin market — little proven demand", tone: "muted" },
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function toneColor(tone: string): string | undefined {
  if (tone === "good") return POSITIVE;
  if (tone === "bad") return ACCENT;
  return undefined;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-console-muted">
        {label}
      </span>
      <span className="tabular font-mono text-sm text-console-foreground">
        {value}
      </span>
    </div>
  );
}

export function NicheScan({ result }: { result: NicheAnalysisResult }) {
  const meta = VERDICT[result.verdict];
  const color = toneColor(meta.tone);
  const maxShare = Math.max(
    0.0001,
    ...result.leaders.map((g) => g.share),
  );

  return (
    <div className="recon-grid relative overflow-hidden rounded-xl border border-console-border bg-console">
      <div className="flex items-center justify-between gap-3 border-b border-console-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="recon-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-console-foreground">
            {result.title}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
          Live scan
        </span>
      </div>

      {result.ok ? (
        <>
          <div className="flex flex-col gap-3 px-4 py-4">
            <span
              className="font-mono text-xs"
              style={{ color }}
            >
              <span className={color ? undefined : "text-console-muted"}>
                {meta.label}
              </span>
              {result.whiteSpace ? (
                <span className="ml-2 rounded-sm bg-positive/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-positive">
                  White space
                </span>
              ) : null}
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Stat label="Live games" value={int(result.gameCount)} />
              <Stat label="Total CCU" value={compact(result.totalPlaying)} />
              <Stat label="Top-1 share" value={pct(result.top1Share)} />
              <Stat label="Top-3 share" value={pct(result.top3Share)} />
            </div>
          </div>

          <div className="border-t border-console-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console-muted">
            Who's winning the niche now
          </div>
          <ul className="flex flex-col divide-y divide-console-border/40">
            {result.leaders.map((g) => (
              <li
                key={g.universeId}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
              >
                <Link
                  href={`/game/${g.universeId}/${slugify(g.name)}`}
                  className="w-44 shrink-0 truncate text-sm text-console-foreground underline-offset-4 hover:underline"
                >
                  {g.name}
                </Link>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-console-border">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(g.share / maxShare) * 100}%` }}
                    aria-hidden
                  />
                </div>
                <span className="tabular w-12 shrink-0 text-right font-mono text-xs text-console-muted">
                  {pct(g.share)}
                </span>
                <span className="tabular w-14 shrink-0 text-right font-mono text-xs text-console-foreground">
                  {compact(g.playing)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-2 px-4 py-5">
          {result.leaders.length > 0 ? (
            <ul className="flex flex-col divide-y divide-console-border/40">
              {result.leaders.map((g) => (
                <li
                  key={g.universeId}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <span className="truncate text-sm text-console-foreground">
                    {g.name}
                  </span>
                  <span className="tabular shrink-0 font-mono text-xs text-console-muted">
                    {compact(g.playing)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {result.note ? (
        <p className="border-t border-console-border px-4 py-2 font-mono text-[10px] leading-relaxed text-console-muted">
          {result.note}
        </p>
      ) : null}
    </div>
  );
}
