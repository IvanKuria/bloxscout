"use client";

/**
 * RevenueCard · inline widget for `estimate_revenue`.
 *
 * Three layouts off one result: a single-game headline (icon + monthly USD +
 * per-1k-CCU efficiency), a focused-genre aggregate, or a top-earners
 * leaderboard. A persistent low-confidence band is rendered in EVERY layout so
 * the heuristic is never mistaken for a precise figure.
 */
import Link from "next/link";
import type { GenreRevenueEntry } from "@bloxscout/core/hosted-format";
import { GameAvatar } from "@/components/copilot/game-avatar";
import type { RevenueGame, RevenueResult } from "@/lib/agent/tools";
import { compact, genreSlug, int, usd } from "@/lib/format";

function ConfidenceBand({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="flex items-start gap-2 border-t border-border bg-muted-surface/40 px-4 py-2.5">
      <span className="mt-0.5 shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
        Low confidence
      </span>
      <p className="text-xs leading-relaxed text-muted-foreground">{disclaimer}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function GameView({ game }: { game: RevenueGame }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <GameAvatar name={game.name} src={game.thumbnailUrl} className="size-14" />
        <div className="flex flex-col">
          <span className="tabular font-heading text-3xl font-semibold leading-none text-foreground">
            {usd(game.estMonthlyUsd)}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            est. / month
          </span>
        </div>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Stat label="Live CCU" value={compact(game.playing)} />
        <Stat label="Est. Robux/mo" value={compact(game.estMonthlyRobux)} />
        <Stat label="Genre" value={game.genre ?? "·"} />
      </div>
    </div>
  );
}

function GenreRow({
  entry,
  max,
}: {
  entry: GenreRevenueEntry;
  max: number;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted-surface/50">
      <Link
        href={`/genre/${genreSlug(entry.genre)}`}
        className="w-36 shrink-0 truncate text-sm text-foreground underline-offset-4 hover:underline"
      >
        {entry.genre}
      </Link>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-surface">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(entry.estTotalMonthlyUsd / max) * 100}%` }}
          aria-hidden
        />
      </div>
      <span className="tabular w-20 shrink-0 text-right text-sm font-medium text-foreground">
        {usd(entry.estTotalMonthlyUsd)}
      </span>
    </li>
  );
}

export function RevenueCard({ result }: { result: RevenueResult }) {
  const rows = result.rows ?? [];
  const max = Math.max(1, ...rows.map((r) => r.estTotalMonthlyUsd));
  const hasBody =
    result.mode === "game" ? Boolean(result.game) : rows.length > 0 || Boolean(result.genre);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            {result.title}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Est. USD / month
        </span>
      </div>

      {result.mode === "game" && result.game ? (
        <GameView game={result.game} />
      ) : null}

      {result.genre ? (
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-heading text-lg font-semibold text-foreground">
              {result.genre.genre}
            </span>
            <span className="tabular font-heading text-2xl font-semibold text-foreground">
              {usd(result.genre.estTotalMonthlyUsd)}
              <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                total/mo
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Games" value={int(result.genre.gameCount)} />
            <Stat label="Median game" value={usd(result.genre.estMedianGameMonthlyUsd)} />
            <Stat label="Top-5/mo" value={usd(result.genre.estTopNMonthlyUsd)} />
            <Stat label="Per 1k CCU" value={usd(result.genre.revenuePerThousandCcuUsd)} />
          </div>
        </div>
      ) : null}

      {(result.mode === "leaderboard" || (result.mode === "genre" && !result.genre)) &&
      rows.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <GenreRow key={genreSlug(r.genre)} entry={r} max={max} />
          ))}
        </ul>
      ) : null}

      {!hasBody ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No revenue data yet."}
        </p>
      ) : null}

      {result.note && hasBody ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {result.note}
        </p>
      ) : null}

      <ConfidenceBand disclaimer={result.disclaimer} />
    </div>
  );
}
