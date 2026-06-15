"use client";

/**
 * HeroBackdrop — the reactbits PixelBlast WebGL field behind the hero, tuned to
 * be a quiet, warm texture rather than a loud effect:
 *   - Dynamically imported with `ssr:false` (three.js touches WebGL/`window`),
 *     so it never runs during SSR and three is kept out of the server bundle.
 *   - Gated behind `prefers-reduced-motion` — returns null, leaving just the
 *     CSS glow below for motion-sensitive users.
 *   - Magenta pixels, edge-faded and held at low opacity; the amber half of the
 *     duotone comes from the radial glow layered over it (in `hero.tsx`).
 */
import * as React from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";

const PixelBlast = dynamic(() => import("@/components/ui/pixel-blast"), {
  ssr: false,
});

/**
 * Swallows any WebGL/shader failure from PixelBlast (driver quirks, lost
 * context, software renderers) so a backdrop that can't initialise degrades
 * silently to the CSS glow instead of taking down the hero.
 */
class WebGLBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroBackdrop() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.32] [mask-image:radial-gradient(110%_75%_at_50%_30%,#000_25%,transparent_75%)]"
    >
      <WebGLBoundary>
        <PixelBlast
          variant="circle"
          color="#ff2d87"
          pixelSize={5}
          patternScale={2.6}
          patternDensity={1.1}
          edgeFade={0.4}
          speed={0.45}
          className="h-full w-full"
        />
      </WebGLBoundary>
    </div>
  );
}
