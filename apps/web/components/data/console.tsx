/**
 * Recon "console" primitives — the dark data-surface look that distinguishes
 * the public data pages. All server-renderable; the only motion is a CSS pulse
 * on the live indicator (disabled under prefers-reduced-motion).
 */
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { growthPct, growthSign, int, utcStamp } from "@/lib/format";

/** Dark panel shell with the faint engineering grid. */
export function ConsolePanel({
  className,
  children,
  label,
}: {
  className?: string;
  children: React.ReactNode;
  /** Optional uppercase corner label, e.g. "LIVE READOUT". */
  label?: string;
}) {
  return (
    <div
      className={cn(
        "recon-grid relative overflow-hidden rounded-xl border border-console-border bg-console text-console-foreground",
        className,
      )}
    >
      {label ? (
        <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** Big live concurrency readout with a pulsing indicator. */
export function LiveCcu({ playing }: { playing: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-console-muted">
        <span
          className="recon-pulse inline-block h-2 w-2 rounded-full bg-accent"
          aria-hidden
        />
        Players in-game now
      </span>
      <span className="tabular font-heading text-5xl font-semibold leading-none text-console-foreground sm:text-6xl">
        {int(playing)}
      </span>
    </div>
  );
}

/** Signed growth chip, colored by direction. */
export function GrowthChip({
  ratio,
  className,
}: {
  ratio: number | null | undefined;
  className?: string;
}) {
  const sign = growthSign(ratio);
  const Icon = sign > 0 ? ArrowUpRight : sign < 0 ? ArrowDownRight : ArrowRight;
  const color =
    sign > 0
      ? "text-positive"
      : sign < 0
        ? "text-negative"
        : "text-console-muted";
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 font-mono text-sm font-medium",
        color,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {growthPct(ratio)}
    </span>
  );
}

/**
 * Visible freshness badge with a machine-readable <time datetime>. Renders the
 * "refreshed every 30 minutes" cadence inline, per the AEO spec.
 */
export function FreshnessBadge({
  iso,
  date,
  className,
}: {
  iso: string;
  date: Date;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-console-muted",
        className,
      )}
    >
      <span
        className="recon-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent"
        aria-hidden
      />
      <span className="uppercase tracking-[0.16em] text-console-foreground">
        Live data
      </span>
      <span aria-hidden>·</span>
      <span>
        as of{" "}
        <time dateTime={iso} className="text-console-foreground">
          {utcStamp(date)}
        </time>
      </span>
      <span aria-hidden>·</span>
      <span>refreshed every 30 minutes</span>
    </span>
  );
}
