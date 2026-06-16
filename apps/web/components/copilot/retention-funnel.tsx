"use client";

/**
 * RetentionFunnel · inline widget for `estimate_retention`. A descending
 * milestone funnel from badge award counts: each bar is that milestone's share
 * of the most-reached badge (progression-through), with the awards-as-%-of-
 * visits read-out where visits are known. A persistent very-low-confidence band
 * keeps the proxy honest.
 */
import { GameAvatar } from "@/components/copilot/game-avatar";
import type { RetentionResult, RetentionStep } from "@/lib/agent/tools";
import { compact } from "@/lib/format";

function Step({ step }: { step: RetentionStep }) {
  const pct = Math.round(step.shareOfTop * 100);
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">
          {step.badgeName}
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
      </div>
      <div className="flex w-24 shrink-0 flex-col items-end gap-0.5">
        <span className="tabular text-sm font-medium text-foreground">
          {compact(step.awardedCount)}
        </span>
        <span className="tabular text-xs text-muted-foreground">
          {step.pctOfVisits === null
            ? `${pct}% of top`
            : `${(step.pctOfVisits * 100).toFixed(step.pctOfVisits < 0.01 ? 2 : 1)}% of visits`}
        </span>
      </div>
    </li>
  );
}

export function RetentionFunnel({ result }: { result: RetentionResult }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-primary"
            aria-hidden
          />
          <span className="text-sm font-medium text-foreground">
            {result.name ?? "Game"} · progression
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Badge funnel
        </span>
      </div>

      {result.ok && result.funnel.length > 0 ? (
        <>
          <div className="flex items-center gap-3 px-4 py-3">
            <GameAvatar name={result.name} src={result.thumbnailUrl} className="size-10" />
            <span className="text-xs text-muted-foreground">
              {result.badgeCount} milestone badge(s)
              {result.visits !== null ? ` · ${compact(result.visits)} all-time visits` : ""}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {result.funnel.map((s) => (
              <Step key={s.badgeName} step={s} />
            ))}
          </ul>
        </>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No progression data available."}
        </p>
      )}

      <div className="flex items-start gap-2 border-t border-border bg-muted/40 px-4 py-2.5">
        <span className="mt-0.5 shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Very low confidence
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {result.ok
            ? "Proxy from dev-defined badge milestones, not true D1/D7 retention."
            : (result.note ??
              "Badge-based proxy unavailable; absence of badges ≠ poor retention.")}
        </p>
      </div>
    </div>
  );
}
