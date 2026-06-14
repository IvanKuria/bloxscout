"use client";

/**
 * IconTrailLayer — a tasteful interactive flourish: real Roblox game icons trail
 * the cursor across a band (vendored fancycomponents `ImageTrail`). Decorative
 * and `aria-hidden`. Disabled under `prefers-reduced-motion` and on touch /
 * coarse pointers (where there is no hover to drive it) so it never adds noise.
 */
import * as React from "react";
import ImageTrail, { ImageTrailItem } from "@/components/fancy/image-trail";

export function IconTrailLayer({ icons }: { icons: string[] }) {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    // Defer the state write into an async callback so it isn't a synchronous
    // setState in the effect body (and so SSR/first paint stay flourish-free).
    const id = requestAnimationFrame(() => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const fine = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      ).matches;
      setEnabled(!reduced && fine);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!enabled || icons.length === 0) return null;

  // Cap to a small recyclable pool for performance.
  const pool = icons.slice(0, 8);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* ImageTrail needs pointer events to read mousemove; re-enable just here. */}
      <ImageTrail
        className="pointer-events-auto h-full w-full"
        threshold={90}
        intensity={0.35}
        keyframes={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
        keyframesOptions={{
          duration: 1.1,
          times: [0, 0.1, 0.7, 1],
          ease: "easeOut",
        }}
        repeatChildren={1}
      >
        {pool.map((src, i) => (
          <ImageTrailItem key={i}>
            <div className="h-14 w-14 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_12px_30px_-14px_rgba(10,10,10,0.5)] ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
          </ImageTrailItem>
        ))}
      </ImageTrail>
    </div>
  );
}
