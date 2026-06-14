import { ArrowUpRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const previewFrame =
  "rounded-lg border border-border bg-muted-surface/60 p-3.5";

/** Find emergent niches — small niches with rising momentum. */
export function NichesPreview() {
  const items = [
    { name: "brainrot", value: "+38%", pct: 100 },
    { name: "anime defenders", value: "+21%", pct: 62 },
    { name: "horror co-op", value: "+14%", pct: 41 },
  ];
  return (
    <div className={previewFrame}>
      <div className="mb-2.5 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        <span>emergent · 7d</span>
        <span>momentum</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.name}
            className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2.5"
          >
            <span className="truncate font-mono text-[11px] text-foreground">
              {item.name}
            </span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${item.pct}%` }}
              />
            </span>
            <span className="font-mono text-[11px] tabular-nums text-positive">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gauge a niche — verdict gauge. */
export function SaturationPreview() {
  return (
    <div className={cn(previewFrame, "flex flex-col gap-2.5")}>
      <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        <span>tower defense</span>
        <span className="text-[#d98a00]">contested</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-border" aria-hidden>
        <span className="block h-full bg-positive/70" style={{ width: "30%" }} />
        <span className="block h-full bg-[#d98a00]" style={{ width: "45%" }} />
        <span className="block h-full bg-accent/80" style={{ width: "25%" }} />
      </div>
      <div className="flex justify-between font-mono text-[9.5px] tracking-wide text-muted-foreground/70">
        <span>open</span>
        <span>locked</span>
      </div>
      <p className="font-mono text-[10px] text-foreground/80">
        top-1 <span className="text-foreground">44%</span> · white space at the tail
      </p>
    </div>
  );
}

/** Spot breakout games — compare growth. */
export function BreakoutsPreview() {
  const path = "M0,18 L12,16 L24,17 L36,11 L48,12 L60,5 L72,6 L84,2";
  return (
    <div className={previewFrame}>
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        <span>breakout · 7d ccu</span>
        <span className="text-positive">+64%</span>
      </div>
      <svg viewBox="0 0 84 22" className="h-12 w-full" aria-hidden>
        <path
          d={`${path} L84,22 L0,22 Z`}
          fill="currentColor"
          className="text-accent/10"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
        />
      </svg>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
        outpacing its genre median
      </p>
    </div>
  );
}

/** Decide what to build — idea direction card. */
export function IdeasPreview() {
  return (
    <div className={cn(previewFrame, "flex flex-col gap-2")}>
      <div className="font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        what should I build?
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[12px] font-medium text-foreground">
          Co-op horror, short sessions
        </p>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
          real demand · leaders fragmented · solo-buildable
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-1 font-mono text-[10px] text-accent">
        winnable for a small team <ArrowUpRight className="h-3 w-3" />
      </span>
    </div>
  );
}

/** Read any game or genre — vs-genre. */
export function IntelligencePreview() {
  const sparkA = "M0,18 L10,14 L20,16 L30,9 L40,11 L50,5 L60,7 L70,3";
  const sparkB = "M0,16 L10,18 L20,13 L30,15 L40,10 L50,12 L60,11 L70,9";
  return (
    <div className={previewFrame}>
      <div className="mb-3 font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        game vs genre · 7d
      </div>
      <div className="grid grid-cols-2 gap-0">
        {[
          { label: "this game", ccu: "102k", delta: "+17%", path: sparkA },
          { label: "genre p50", ccu: "41k", delta: "+6%", path: sparkB },
        ].map((side, i) => (
          <div
            key={side.label}
            className={cn(
              "flex flex-col gap-1.5 px-3 py-1",
              i === 0 && "border-r border-border",
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              {side.label}
            </span>
            <span className="font-mono text-base font-semibold tabular-nums text-foreground">
              {side.ccu}
            </span>
            <svg viewBox="0 0 70 22" className="h-5 w-full" aria-hidden>
              <path
                d={side.path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={i === 0 ? "text-accent" : "text-foreground/40"}
              />
            </svg>
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                i === 0 ? "text-accent" : "text-muted-foreground",
              )}
            >
              {side.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Always-live data — refresh cadence + live snapshots. */
export function TrendsPreview() {
  const points = [
    { x: 0, y: 18 },
    { x: 20, y: 14 },
    { x: 40, y: 15 },
    { x: 60, y: 11 },
    { x: 80, y: 8 },
    { x: 100, y: 6 },
  ];
  const path = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  return (
    <div className={previewFrame}>
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        <span>live ccu</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="recon-pulse h-1.5 w-1.5 rounded-full bg-positive" />
          live
        </span>
      </div>
      <svg viewBox="0 0 100 24" className="h-12 w-full" aria-hidden>
        <path d={`${path} L100,24 L0,24 Z`} fill="currentColor" className="text-accent/10" />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
        />
        {points.map((p) => (
          <circle key={p.x} cx={p.x} cy={p.y} r="1.2" fill="currentColor" className="text-accent" />
        ))}
      </svg>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground/80">
        refreshed every ~30 min · timestamped
      </p>
    </div>
  );
}

/** Creator leaderboard — used as a flourish inside intelligence if needed. */
export function CreatorPreview() {
  const creators = [
    { name: "Hyperion Studios", followers: "4.2M", color: "bg-accent" },
    { name: "Onyx Labs", followers: "2.1M", color: "bg-foreground" },
    { name: "Polar Games", followers: "940k", color: "bg-muted-foreground" },
  ];
  return (
    <div className={previewFrame}>
      <div className="mb-2.5 font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        top creators · rpg
      </div>
      <ul className="space-y-2">
        {creators.map((c, i) => (
          <li key={c.name} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-background",
                c.color,
              )}
              aria-hidden
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 truncate text-[12px] font-medium text-foreground">
              {c.name}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
              <Star className="h-3 w-3 fill-current" strokeWidth={0} />
              {c.followers}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const previewBySlug = {
  niches: NichesPreview,
  saturation: SaturationPreview,
  breakouts: BreakoutsPreview,
  ideas: IdeasPreview,
  intelligence: IntelligencePreview,
  trends: TrendsPreview,
} as const;
