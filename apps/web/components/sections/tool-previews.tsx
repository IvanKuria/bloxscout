import { ArrowDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const previewFrame =
  "rounded-md border border-border bg-muted-surface/70 p-3.5";

export function DiscoveryPreview() {
  const items = [
    { name: "blox fruits", value: 932, pct: 100 },
    { name: "pet simulator 99", value: 614, pct: 66 },
    { name: "tower defense x", value: 412, pct: 44 },
  ];
  return (
    <div className={previewFrame}>
      <div className="mb-2.5 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        <span>top · simulator</span>
        <span>ccu</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2.5">
            <span className="truncate font-mono text-[11px] text-foreground">
              {item.name}
            </span>
            <span
              className="relative h-1.5 overflow-hidden rounded-full bg-border"
              aria-hidden
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${item.pct}%` }}
              />
            </span>
            <span className="font-mono text-[11px] tabular-nums text-foreground">
              {item.value}k
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntelligencePreview() {
  const sparkA = "M0,18 L10,14 L20,16 L30,9 L40,11 L50,5 L60,7 L70,3";
  const sparkB = "M0,16 L10,18 L20,13 L30,15 L40,10 L50,12 L60,11 L70,9";
  return (
    <div className={previewFrame}>
      <div className="mb-3 font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        compare · 7d ccu
      </div>
      <div className="grid grid-cols-2 gap-0">
        {[
          { label: "game A", ccu: "102k", delta: "+17%", path: sparkA, positive: true },
          { label: "game B", ccu: "87k", delta: "+8%", path: sparkB, positive: true },
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
                className="text-foreground/70"
              />
            </svg>
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                side.positive ? "text-accent" : "text-muted-foreground",
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

export function CalculatorPreview() {
  return (
    <div className={cn(previewFrame, "flex flex-col items-center gap-1.5 py-5")}>
      <div className="flex items-baseline gap-1.5 font-mono text-[15px] tabular-nums text-muted-foreground">
        100,000 <span className="text-[12px]">R$</span>
      </div>
      <ArrowDown className="h-3.5 w-3.5 text-accent" />
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          $350.00
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">USD</span>
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-wide text-muted-foreground/70">
        rate · $0.0035 / R$
      </p>
    </div>
  );
}

export function OperationalPreview() {
  const points = [
    { x: 0, y: 18, label: "12:00", v: "102k" },
    { x: 20, y: 14, label: "12:05", v: "103k" },
    { x: 40, y: 15, label: "12:10", v: "103k" },
    { x: 60, y: 11, label: "12:15", v: "104k" },
    { x: 80, y: 8, label: "12:20", v: "105k" },
    { x: 100, y: 6, label: "12:25", v: "105k" },
  ];
  const path = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  return (
    <div className={previewFrame}>
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
        <span>snapshot · 920587237</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          live
        </span>
      </div>
      <svg viewBox="0 0 100 24" className="h-12 w-full" aria-hidden>
        <path
          d={`${path} L100,24 L0,24 Z`}
          fill="currentColor"
          className="text-accent/10"
        />
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
          <circle
            key={p.x}
            cx={p.x}
            cy={p.y}
            r="1.2"
            fill="currentColor"
            className="text-accent"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9.5px] text-muted-foreground">
        <span>12:00</span>
        <span>12:25</span>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
        → ~/.bloxscout/data.db
      </p>
    </div>
  );
}

export function ReportsPreview() {
  return (
    <div
      className={cn(
        previewFrame,
        "border-foreground/15 bg-background shadow-[2px_2px_0_0] shadow-foreground/5",
      )}
    >
      <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
        <span className="font-mono text-[11px] font-medium text-foreground">
          rpg-report.md
        </span>
        <span className="font-mono text-[9.5px] tracking-wide text-muted-foreground/70 uppercase">
          md · json
        </span>
      </div>
      <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
        <p className="font-semibold text-foreground">
          # RPG market — 2026-05-21
        </p>
        <p className="text-muted-foreground">
          <span className="text-accent">▸</span> median ccu{" "}
          <span className="text-foreground">12,400</span>
        </p>
        <p className="text-muted-foreground">
          <span className="text-accent">▸</span> p90 ccu{" "}
          <span className="text-foreground">142,800</span>
        </p>
        <p className="text-muted-foreground">
          <span className="text-accent">▸</span> top creators{" "}
          <span className="text-foreground">8</span>
        </p>
      </div>
    </div>
  );
}

export const previewBySlug = {
  discovery: DiscoveryPreview,
  intelligence: IntelligencePreview,
  creator: CreatorPreview,
  calculators: CalculatorPreview,
  operational: OperationalPreview,
  reports: ReportsPreview,
} as const;
