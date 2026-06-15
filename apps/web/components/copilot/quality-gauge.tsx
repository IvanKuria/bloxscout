"use client";

/**
 * QualityGauge · inline widget for `get_game_quality`. A radial like-ratio gauge
 * (loved → mixed → poor) with the raw up/down counts. Mirrors the NicheCard
 * gauge so the agent's widgets share a visual language. The accent flips to the
 * positive colour for a "loved" game.
 */
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { GameAvatar } from "@/components/copilot/game-avatar";
import type { GameQualityResult, QualityBand } from "@/lib/agent/tools";
import { compact } from "@/lib/format";

const ACCENT = "#ff2d87";
const POSITIVE = "#1faa6b";
const NEUTRAL = "#c79a1e";
const TRACK = "#ececec";

function bandColor(band: QualityBand | null): string {
  if (band === "loved") return POSITIVE;
  if (band === "mixed") return NEUTRAL;
  if (band === "poor") return ACCENT;
  return TRACK;
}

function bandLabel(band: QualityBand | null): string {
  if (band === "loved") return "Loved";
  if (band === "mixed") return "Mixed";
  if (band === "poor") return "Poorly rated";
  return "Unrated";
}

function Gauge({ result }: { result: GameQualityResult }) {
  const pct = result.likeRatio === null ? 0 : Math.round(result.likeRatio * 100);
  const color = bandColor(result.qualityBand);
  const data = [{ name: "like", value: pct, fill: color }];
  return (
    <div className="relative size-32 shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="74%"
          outerRadius="100%"
          data={data}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
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
        <span className="tabular font-heading text-3xl font-semibold leading-none text-foreground">
          {result.likeRatio === null ? "·" : `${pct}%`}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          liked
        </span>
      </div>
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

export function QualityGauge({ result }: { result: GameQualityResult }) {
  const hasGauge = result.ok && result.likeRatio !== null;
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            {result.name ?? "Game"} · quality
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Like-ratio
        </span>
      </div>

      {hasGauge ? (
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center">
          <Gauge result={result} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-3">
              <GameAvatar name={result.name} src={result.thumbnailUrl} className="size-10" />
              <span
                className="text-sm font-medium"
                style={{ color: bandColor(result.qualityBand) }}
              >
                {bandLabel(result.qualityBand)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              <Stat label="Up-votes" value={compact(result.upVotes)} />
              <Stat label="Down-votes" value={compact(result.downVotes)} />
              <Stat label="Total" value={compact(result.totalVotes)} />
            </div>
          </div>
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No quality data available."}
        </p>
      )}

      {result.note && hasGauge ? (
        <p className="border-t border-border bg-muted-surface/40 px-4 py-2.5 text-xs text-muted-foreground">
          {result.note}
        </p>
      ) : null}
    </div>
  );
}
