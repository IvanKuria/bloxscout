/**
 * Dependency-free SVG sparkline. Server-renderable (no client JS) so it never
 * gates LCP. Degrades to an explicit "awaiting history" state when there are
 * fewer than two points — the young dataset often has 0-1 points per game.
 */
import { cn } from "@/lib/utils";

export interface SparklinePoint {
  t: number;
  avg: number;
  peak: number;
}

interface SparklineProps {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  className?: string;
  /** Accessible label; also used as <title>. */
  label?: string;
}

export function Sparkline({
  points,
  width = 640,
  height = 140,
  className,
  label = "Concurrent player history",
}: SparklineProps) {
  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex h-[140px] items-center justify-center rounded-md border border-console-border bg-console/60 px-4 text-center font-mono text-xs text-console-muted",
          className,
        )}
        role="img"
        aria-label="Player count history not available yet"
      >
        Awaiting history — bloxscout began tracking this game recently. The
        trend line fills in as snapshots accumulate (every 30&nbsp;minutes).
      </div>
    );
  }

  const pad = 6;
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.avg);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const sx = (x: number) => pad + ((x - minX) / spanX) * (width - pad * 2);
  const sy = (y: number) =>
    height - pad - ((y - minY) / spanY) * (height - pad * 2);

  const line = points.map((p) => `${sx(p.t)},${sy(p.avg)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-[140px] w-full", className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id="recon-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#recon-spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={sx(last.t)}
        cy={sy(last.avg)}
        r="3.5"
        fill="var(--accent)"
        stroke="var(--console)"
        strokeWidth="2"
      />
    </svg>
  );
}
