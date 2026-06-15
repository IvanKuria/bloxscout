import { cn } from "@/lib/utils";

/**
 * The capability preview mini-visuals — clean, abstract, MONOCHROME typographic
 * / data treatments. No game thumbnails or icons: a minimal saturation arc, a
 * ranked text list, a sparkline, stat tickers. Charcoal ink on hairline frames;
 * they read as polished product intel, not decoration.
 */

const frame =
  "rounded-md border border-foreground/10 bg-background/60 p-4";
const label =
  "font-mono text-[9.5px] tracking-[0.16em] text-foreground/40 uppercase";

/** Find emergent niches — ranked momentum list with thin bars. */
export function NichesPreview() {
  const items = [
    { name: "brainrot", value: "+38%", pct: 100 },
    { name: "anime defenders", value: "+21%", pct: 62 },
    { name: "horror co-op", value: "+14%", pct: 41 },
  ];
  return (
    <div className={frame}>
      <div className="mb-3 flex items-center justify-between">
        <span className={label}>emergent · 7d</span>
        <span className={label}>momentum</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li
            key={item.name}
            className="grid grid-cols-[1fr_1.5fr_auto] items-center gap-3"
          >
            <span className="truncate font-mono text-[11px] text-foreground/75">
              {item.name}
            </span>
            <span
              className="relative h-[3px] overflow-hidden rounded-full bg-foreground/10"
              aria-hidden
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                style={{ width: `${item.pct}%` }}
              />
            </span>
            <span className="font-mono text-[11px] tabular-nums text-foreground/55">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gauge a niche — a minimal saturation arc. */
export function SaturationPreview() {
  // semicircle arc, 0..180deg; needle at ~62% (contested-leaning-open)
  const pct = 0.38; // openness
  const angle = 180 * pct; // from left (open) sweeping right (locked)
  const r = 46;
  const cx = 60;
  const cy = 56;
  const rad = (Math.PI * (180 - angle)) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  return (
    <div className={cn(frame, "flex flex-col items-center gap-2")}>
      <div className="mb-1 flex w-full items-center justify-between">
        <span className={label}>tower defense</span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-foreground/70 uppercase">
          open
        </span>
      </div>
      <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
        <path
          d="M14 56 A46 46 0 0 1 106 56"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-foreground/12"
        />
        <path
          d="M14 56 A46 46 0 0 1 106 56"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="145"
          strokeDashoffset={145 * (1 - pct)}
          className="text-foreground/75"
        />
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-foreground"
        />
        <circle cx={cx} cy={cy} r="2.5" className="fill-foreground" />
      </svg>
      <p className="font-mono text-[10px] text-foreground/55">
        top-1 <span className="text-foreground">44%</span> · white space in the
        tail
      </p>
    </div>
  );
}

/** Spot breakout games — a sparkline. */
export function BreakoutsPreview() {
  const path = "M0,18 L12,16 L24,17 L36,11 L48,12 L60,5 L72,6 L84,2";
  return (
    <div className={frame}>
      <div className="mb-2 flex items-center justify-between">
        <span className={label}>breakout · 7d ccu</span>
        <span className="font-mono text-[11px] tabular-nums text-foreground/70">
          +64%
        </span>
      </div>
      <svg viewBox="0 0 84 22" className="h-12 w-full" aria-hidden>
        <path
          d={`${path} L84,22 L0,22 Z`}
          fill="currentColor"
          className="text-foreground/[0.06]"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground/80"
        />
        <circle cx="84" cy="2" r="1.6" className="fill-foreground" />
      </svg>
      <p className="mt-1.5 font-mono text-[10px] text-foreground/50">
        outpacing its genre median
      </p>
    </div>
  );
}

/** Decide what to build — idea direction read-out. */
export function IdeasPreview() {
  return (
    <div className={cn(frame, "flex flex-col gap-2.5")}>
      <span className={label}>what should I build?</span>
      <div className="rounded border border-foreground/10 bg-background px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Co-op horror · short sessions
        </p>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-foreground/50">
          real demand · leaders fragmented · solo-buildable
        </p>
      </div>
      <span className="font-mono text-[10px] tracking-[0.1em] text-foreground/70 uppercase">
        → winnable for a small team
      </span>
    </div>
  );
}

/** Read any game or genre — two stat tickers vs the genre. */
export function IntelligencePreview() {
  const sparkA = "M0,18 L10,14 L20,16 L30,9 L40,11 L50,5 L60,7 L70,3";
  const sparkB = "M0,16 L10,18 L20,13 L30,15 L40,10 L50,12 L60,11 L70,9";
  return (
    <div className={frame}>
      <div className="mb-3">
        <span className={label}>game vs genre · 7d</span>
      </div>
      <div className="grid grid-cols-2">
        {[
          { name: "this game", ccu: "102k", delta: "+17%", path: sparkA, strong: true },
          { name: "genre p50", ccu: "41k", delta: "+6%", path: sparkB, strong: false },
        ].map((side, i) => (
          <div
            key={side.name}
            className={cn(
              "flex flex-col gap-1.5 px-3 py-1",
              i === 0 && "border-r border-foreground/10",
            )}
          >
            <span className="font-mono text-[10px] text-foreground/50">
              {side.name}
            </span>
            <span className="tabular font-mono text-base font-medium text-foreground">
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
                className={side.strong ? "text-foreground/80" : "text-foreground/30"}
              />
            </svg>
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                side.strong ? "text-foreground/70" : "text-foreground/45",
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

/** Always-live data — a refresh sparkline with a live dot. */
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
    <div className={frame}>
      <div className="mb-2 flex items-center justify-between">
        <span className={label}>live ccu</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-foreground/60 uppercase">
          <span className="recon-pulse h-1.5 w-1.5 rounded-full bg-foreground" />
          live
        </span>
      </div>
      <svg viewBox="0 0 100 24" className="h-12 w-full" aria-hidden>
        <path
          d={`${path} L100,24 L0,24 Z`}
          fill="currentColor"
          className="text-foreground/[0.06]"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground/80"
        />
        {points.map((p) => (
          <circle key={p.x} cx={p.x} cy={p.y} r="1.1" className="fill-foreground/70" />
        ))}
      </svg>
      <p className="mt-2 font-mono text-[10px] text-foreground/50">
        refreshed every ~30 min · timestamped
      </p>
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
