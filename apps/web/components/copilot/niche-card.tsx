"use client";

/**
 * NicheCard — inline saturation widget for `get_genre_saturation`.
 *
 * A recon-styled card with a Recharts radial gauge (0-100 saturation), the
 * concentration read-outs, and a compact leaderboard of the most-saturated
 * genres for context. The gauge arc is the single accent; "white space" flips
 * it to the positive colour. Recharts is pinned to a React-19-safe 2.x.
 */
import * as React from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import Link from "next/link";
import type { NicheGauge, SaturationResult } from "@/lib/agent/tools";
import { compact, dec, int } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCENT = "#e2231a";
const POSITIVE = "#1faa6b";
const TRACK = "#1d2528";

function scoreColor(score: number | null, whiteSpace: boolean): string {
  if (whiteSpace) return POSITIVE;
  if (score === null) return TRACK;
  return ACCENT;
}

function verdict(g: NicheGauge): string {
  if (g.saturationScore === null) return "Not enough data to score yet";
  if (g.whiteSpace) return "Under-served — room to enter";
  if (g.saturationScore >= 70) return "Crowded — hard to break in";
  if (g.saturationScore >= 45) return "Competitive";
  return "Open";
}

function Gauge({ gauge }: { gauge: NicheGauge }) {
  const score = gauge.saturationScore ?? 0;
  const color = scoreColor(gauge.saturationScore, gauge.whiteSpace);
  const data = [{ name: gauge.genre, value: score, fill: color }];
  return (
    <div className="relative h-32 w-32 shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="74%"
          outerRadius="100%"
          data={data}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: TRACK }}
            dataKey="value"
            cornerRadius={8}
            angleAxisId={0}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-heading text-3xl font-semibold leading-none text-console-foreground">
          {gauge.saturationScore === null ? "—" : Math.round(score)}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-console-muted">
          / 100
        </span>
      </div>
    </div>
  );
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

function FocusCard({ gauge }: { gauge: NicheGauge }) {
  const color = scoreColor(gauge.saturationScore, gauge.whiteSpace);
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center">
      <Gauge gauge={gauge} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-lg font-semibold leading-tight text-console-foreground">
            {gauge.genre}
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: gauge.whiteSpace ? POSITIVE : undefined }}
          >
            <span className={cn(!gauge.whiteSpace && "text-console-muted")}>
              {verdict(gauge)}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat label="Games" value={int(gauge.gameCount)} />
          <Stat label="Total CCU" value={compact(gauge.totalPlaying)} />
          <Stat label="Top-1 share" value={`${Math.round(gauge.top1Share * 100)}%`} />
          <Stat label="Per game" value={compact(gauge.playersPerGame)} />
        </div>
        {gauge.reason ? (
          <p className="font-mono text-[11px] leading-relaxed text-console-muted">
            {gauge.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Leaderboard({ niches }: { niches: NicheGauge[] }) {
  const max = Math.max(1, ...niches.map((n) => n.saturationScore ?? 0));
  return (
    <ul className="flex flex-col divide-y divide-console-border/40">
      {niches.map((n) => {
        const score = n.saturationScore ?? 0;
        const color = scoreColor(n.saturationScore, n.whiteSpace);
        return (
          <li
            key={n.slug}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
          >
            <Link
              href={`/genre/${n.slug}/saturation`}
              className="w-40 shrink-0 truncate text-sm text-console-foreground underline-offset-4 hover:underline"
            >
              {n.genre}
            </Link>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-console-border">
              <div
                className="h-full rounded-full"
                style={{ width: `${(score / max) * 100}%`, background: color }}
                aria-hidden
              />
            </div>
            <span className="tabular w-10 shrink-0 text-right font-mono text-xs text-console-foreground">
              {n.saturationScore === null ? "—" : Math.round(score)}
            </span>
            {n.whiteSpace ? (
              <span className="shrink-0 rounded-sm bg-positive/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-positive">
                White space
              </span>
            ) : (
              <span className="w-[68px] shrink-0" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function NicheCard({ result }: { result: SaturationResult }) {
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
          Saturation 0-100
        </span>
      </div>

      {result.focus ? <FocusCard gauge={result.focus} /> : null}

      {result.niches.length > 0 ? (
        <>
          {result.focus ? (
            <div className="border-t border-console-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console-muted">
              Most saturated genres
            </div>
          ) : null}
          <Leaderboard niches={result.niches} />
        </>
      ) : null}

      {result.niches.length === 0 && !result.focus ? (
        <p className="px-4 py-6 text-center font-mono text-xs text-console-muted">
          {result.note ?? "No scored genres yet."}
        </p>
      ) : null}

      {result.note && (result.focus || result.niches.length > 0) ? (
        <p className="border-t border-console-border px-4 py-2 font-mono text-[10px] text-console-muted">
          {result.note}
        </p>
      ) : null}
    </div>
  );
}
