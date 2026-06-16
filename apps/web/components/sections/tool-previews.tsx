/**
 * Capability preview visuals — compact, FRAMELESS data snippets (the capability
 * cards in tool-catalog supply the frame + title). Each capability gets a
 * distinct chart type: momentum bars, a concentration split, breakout columns,
 * a fit meter, a percentile distribution, a trend line. Colours are wired to the
 * neutral semantic theme tokens (foreground accent + muted neutral) so every
 * preview reads correctly in light and dark — no hardcoded hex, no gradients.
 */

const ACCENT = "var(--foreground)";
const NEUTRAL = "var(--muted-foreground)";

/* 1. Find emergent niches → ranked momentum bars */
export function NichesPreview() {
  const rows = [
    { name: "brainrot", pct: 100, delta: "+38%", hot: true },
    { name: "horror co-op", pct: 66, delta: "+21%", hot: true },
    { name: "anime defenders", pct: 44, delta: "+14%", hot: false },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{r.name}</span>
            <span className="text-[11px] tabular-nums text-foreground">{r.delta}</span>
          </div>
          <span className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]" aria-hidden>
            <span
              className="block h-full rounded-full"
              style={{ width: `${r.pct}%`, backgroundColor: r.hot ? ACCENT : NEUTRAL }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

/* 2. Gauge a niche → market-concentration split */
export function SaturationPreview() {
  const segs = [
    { w: 44, fill: ACCENT, op: 1 },
    { w: 31, fill: ACCENT, op: 0.4 },
    { w: 25, fill: "currentColor", className: "text-foreground/12", op: 1 },
  ];
  let acc = 0;
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 260 24" className="w-full" aria-hidden>
        {segs.map((s, i) => {
          const x = (acc / 100) * 260;
          acc += s.w;
          const w = (s.w / 100) * 260 - 3;
          return (
            <rect key={i} x={x} y="0" width={Math.max(w, 0)} height="24" rx="4" fill={s.fill} opacity={s.op} className={s.className} />
          );
        })}
      </svg>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>top-1 <span className="text-foreground">44%</span></span>
        <span>top-3 <span className="text-foreground">75%</span></span>
        <span>tail <span className="text-foreground">25%</span></span>
      </div>
    </div>
  );
}

/* 3. Spot breakout games → growth columns */
export function BreakoutsPreview() {
  const cols = [
    { name: "Anime Defenders", h: 100, delta: "+64%", lead: true },
    { name: "Toilet TD", h: 62, delta: "+38%", lead: false },
    { name: "Critical Legends", h: 40, delta: "+22%", lead: false },
    { name: "Pet Sim 99", h: 26, delta: "+14%", lead: false },
  ];
  return (
    <div>
      {/* bars are direct children of a fixed-height row so % heights resolve */}
      <div className="flex h-24 items-end gap-2.5">
        {cols.map((c) => (
          <span
            key={c.name}
            className={`flex-1 rounded-t-sm ${c.lead ? "" : "bg-foreground/12"}`}
            style={{ height: `${c.h}%`, backgroundColor: c.lead ? ACCENT : undefined }}
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-2 flex gap-2.5">
        {cols.map((c) => (
          <span
            key={c.name}
            className={`flex-1 text-center text-[10px] tabular-nums ${c.lead ? "text-foreground" : "text-muted-foreground"}`}
          >
            {c.delta}
          </span>
        ))}
      </div>
    </div>
  );
}

/* 4. Decide what to build → recommendation + fit meter */
export function IdeasPreview() {
  const chips = ["real demand", "fragmented", "solo-buildable"];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
        Co-op horror · short sessions
      </p>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Fit for a solo dev</span>
          <span className="text-foreground">86%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full" style={{ width: "86%", backgroundColor: ACCENT }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c} className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/* 5. Read any game or genre → percentile distribution */
export function IntelligencePreview() {
  const hill = "M6,72 C50,72 60,22 130,22 C200,22 210,72 254,72";
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox="0 0 260 80" className="h-24 w-full" aria-hidden>
        <path d={`${hill} L254,76 L6,76 Z`} fill="currentColor" className="text-foreground/[0.05]" />
        <path d={hill} fill="none" stroke="currentColor" strokeWidth="1.4" className="text-foreground/25" />
        <line x1="130" y1="10" x2="130" y2="76" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-foreground/25" />
        <line x1="206" y1="16" x2="206" y2="76" stroke={ACCENT} strokeWidth="2.4" />
        <circle cx="206" cy="16" r="3.5" fill={ACCENT} />
        <text x="200" y="11" fontSize="8.5" textAnchor="end" fill={ACCENT} style={{ fontWeight: 600 }}>p82</text>
      </svg>
      <p className="text-[10px] text-muted-foreground">
        Top <span className="text-foreground">18%</span> of its genre
      </p>
    </div>
  );
}

/* 6. Always-live data → trend line */
export function TrendsPreview() {
  const line = "M0,52 L40,42 L80,46 L120,30 L160,33 L200,18 L240,13 L280,4";
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox="0 0 280 56" className="h-24 w-full" aria-hidden>
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="280" cy="4" r="3" fill={ACCENT} />
      </svg>
      <p className="text-[10px] text-muted-foreground">
        274,120 playing now · refreshed ~30 min
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
