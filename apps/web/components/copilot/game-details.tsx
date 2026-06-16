"use client";

/**
 * GameDetails · the inline widget for the `get_game_details` tool. Shows one
 * game's live stats + bloxscout-derived signals (growth windows, age, update
 * cadence, like-ratio with raw counts, a compact CCU sparkline) so the agent's
 * narration is visibly grounded in the same numbers.
 */
import type { GameDetailsResult } from "@/lib/agent/tools";

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "·";
  const v = Math.round(n * 100);
  return `${v > 0 ? "+" : ""}${v}%`;
}

function num(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "·";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n));
}

/** Tiny inline sparkline from the CCU series. */
function Sparkline({ points }: { points: { t: number; avg: number }[] }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.avg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 120;
  const h = 28;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p.avg - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="text-accent" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="text-sm tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function GameDetails({ result }: { result: GameDetailsResult }) {
  if (!result || !result.ok || !result.name) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {result?.note ?? "No data for that game yet."}
      </div>
    );
  }
  const e = result.enrichment;
  const ageLabel =
    e?.ageDays != null
      ? e.ageDays >= 365
        ? `${(e.ageDays / 365).toFixed(1)}y`
        : `${Math.round(e.ageDays)}d`
      : "·";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center gap-3 border-b border-border p-4">
        {result.thumbnailUrl ? (
          // biome-ignore lint/performance/noImgElement: small external thumb
          <img
            src={result.thumbnailUrl}
            alt=""
            className="size-12 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">
            {result.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {result.genre ?? "·"}
            {result.creatorName ? ` · by ${result.creatorName}` : ""}
          </span>
        </div>
        {e?.ccuSeries && e.ccuSeries.length > 1 ? (
          <div className="ml-auto shrink-0">
            <Sparkline points={e.ccuSeries} />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 sm:grid-cols-4">
        <Stat label="Playing" value={num(result.playing)} />
        <Stat
          label="Like ratio"
          value={
            result.likeRatio != null
              ? `${Math.round(result.likeRatio * 100)}%`
              : "·"
          }
        />
        <Stat label="Votes" value={num(result.totalVotes)} />
        <Stat label="Age" value={ageLabel} />
        <Stat label="24h" value={pct(e?.growth24hPct)} />
        <Stat label="7d" value={pct(e?.growth7dPct)} />
        <Stat label="30d" value={pct(e?.growth30dPct)} />
        <Stat label="Updates" value={num(e?.updateCount)} />
      </div>

      {e?.thinHistory && e.historyNote ? (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {e.historyNote}
        </p>
      ) : null}
    </div>
  );
}
