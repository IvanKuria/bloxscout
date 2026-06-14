"use client";

/**
 * HeroFloatCluster — the signature moment.
 *
 * Real Roblox game icons are dropped into a Matter.js physics surface (vendored
 * fancycomponents.dev `Gravity` + `MatterBody`): they fall, settle, collide, and
 * stay grab-and-throw draggable. The whole cluster is decorative (`aria-hidden`)
 * and lives behind the hero copy.
 *
 * Guards:
 *   - `prefers-reduced-motion` → renders a calm static scatter of the same icons,
 *     no engine, no rAF.
 *   - no icons (data fetch came back empty) → renders nothing; the hero copy
 *     stands on its own.
 *   - the physics canvas only mounts after a `useState`-gated client check so the
 *     server output is the static fallback and there's no hydration mismatch.
 */
import * as React from "react";
import Gravity, { MatterBody } from "@/components/fancy/gravity";

export type HeroIcon = { id: number; url: string; name: string | null };

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Deterministic pseudo-random in [0,1) from an integer seed (stable per id). */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// A spread of tile sizes so the pile reads as playful, not gridded.
const SIZES = ["h-14 w-14", "h-16 w-16", "h-20 w-20", "h-24 w-24"];

function Tile({
  icon,
  size,
  rounded = "rounded-2xl",
}: {
  icon: HeroIcon;
  size: string;
  rounded?: string;
}) {
  return (
    <div
      className={`${size} ${rounded} overflow-hidden border border-black/5 bg-white shadow-[0_10px_30px_-12px_rgba(10,10,10,0.35)] ring-1 ring-black/5`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon.url}
        alt=""
        draggable={false}
        loading="lazy"
        className="h-full w-full object-cover select-none"
      />
    </div>
  );
}

export function HeroFloatCluster({ icons }: { icons: HeroIcon[] }) {
  // SSR + first client render show the static fallback; we only swap to the
  // physics canvas after mount (in an async rAF callback, never synchronously in
  // the effect body) and only when motion is allowed.
  const [mounted, setMounted] = React.useState(false);
  const reduced = React.useState(prefersReducedMotion)[0];

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (icons.length === 0) return null;

  // Cap the body count: physics is cheap here but we keep it tasteful + perf-safe.
  const tiles = icons.slice(0, 16);

  // Static fallback (also the SSR output) — a soft diagonal scatter.
  if (!mounted || reduced) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {tiles.map((icon, i) => {
          // Fixed precision so the SSR string and the client string are
          // byte-identical (a sin-based PRNG can diverge in late decimals
          // across the Node/browser V8 builds → hydration mismatch).
          const left = (6 + seeded(icon.id + 1) * 84).toFixed(3);
          const top = (8 + seeded(icon.id + 7) * 78).toFixed(3);
          const rot = ((seeded(icon.id + 3) - 0.5) * 24).toFixed(3);
          const size = SIZES[i % SIZES.length];
          return (
            <div
              key={icon.id}
              className="absolute opacity-90"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `rotate(${rot}deg)`,
              }}
            >
              <Tile icon={icon} size={size} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div aria-hidden className="absolute inset-0">
      <Gravity
        gravity={{ x: 0, y: 0.65 }}
        className="absolute inset-0"
        grabCursor
        addTopWall={false}
      >
        {tiles.map((icon, i) => {
          // Drop from across the top; randomized so they settle into a pile.
          const x = `${6 + seeded(icon.id + 11) * 86}%`;
          const y = `${-12 - seeded(icon.id + 5) * 40}%`;
          const angle = (seeded(icon.id + 2) - 0.5) * 40;
          const size = SIZES[i % SIZES.length];
          // Every 4th tile is a rounder "bubble" body for variety.
          const isCircle = i % 4 === 3;
          return (
            <MatterBody
              key={icon.id}
              x={x}
              y={y}
              angle={angle}
              bodyType={isCircle ? "circle" : "rectangle"}
              matterBodyOptions={{
                friction: 0.4,
                restitution: 0.35,
                density: 0.0014,
              }}
            >
              <Tile
                icon={icon}
                size={size}
                rounded={isCircle ? "rounded-full" : "rounded-2xl"}
              />
            </MatterBody>
          );
        })}
      </Gravity>
    </div>
  );
}
