"use client";

/**
 * CompetitorMap — inline widget for `map_competitors`. A ranked table of the
 * games Roblox's own recommendation graph treats as adjacent to the anchor,
 * each with live CCU and a like-ratio chip. The CCU bar is the single accent.
 */
import Link from "next/link";
import { GameAvatar } from "@/components/copilot/game-avatar";
import type { CompetitorMapResult, CompetitorRow } from "@/lib/agent/tools";
import { compact, displayName, slugify } from "@/lib/format";

function ratioTone(ratio: number | null): string {
  if (ratio === null) return "text-muted-foreground";
  if (ratio >= 0.85) return "text-positive";
  if (ratio >= 0.65) return "text-foreground";
  return "text-accent";
}

function Row({ row, max }: { row: CompetitorRow; max: number }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted-surface/50">
      <GameAvatar name={row.name} src={row.thumbnailUrl} className="size-9" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/game/${row.universeId}/${slugify(row.name)}`}
          className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {displayName(row.name)}
        </Link>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted-surface">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(row.playing / max) * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
      <div className="flex w-24 shrink-0 flex-col items-end gap-0.5">
        <span className="tabular text-sm font-medium text-foreground">
          {compact(row.playing)}
        </span>
        <span className={`tabular text-xs ${ratioTone(row.likeRatio)}`}>
          {row.likeRatio === null ? "—" : `${Math.round(row.likeRatio * 100)}% liked`}
        </span>
      </div>
    </li>
  );
}

export function CompetitorMap({ result }: { result: CompetitorMapResult }) {
  const max = Math.max(1, ...result.rows.map((r) => r.playing));
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="recon-pulse inline-block size-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            {result.anchorName ? `Competitors · ${result.anchorName}` : "Competitors"}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Players now
        </span>
      </div>

      {result.rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No competitors mapped yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {result.rows.map((r) => (
            <Row key={r.universeId} row={r} max={max} />
          ))}
        </ul>
      )}

      {result.rows.length > 0 ? (
        <div className="border-t border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {compact(result.totalPlaying)} players across {result.rows.length} neighbours · Roblox recommendation graph
        </div>
      ) : null}
    </div>
  );
}
