"use client";

/**
 * AnimatedContent — the canonical reactbits.dev component (GSAP + ScrollTrigger,
 * free core — not the paid SplitText plugin), installed via
 * `npx shadcn add https://reactbits.dev/r/AnimatedContent-TS-TW`, then hardened:
 *   - `"use client"`.
 *   - A `prefers-reduced-motion` short-circuit that renders children visible
 *     with no animation (so we never hide content from motion-sensitive users).
 *   - Used for DECORATIVE reveals (framed product mockups, cards). SEO-critical
 *     copy uses motion's in-place `whileInView` instead, since this component
 *     starts its children `invisible` until the scroll trigger fires.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 60,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  className = "",
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const axis = direction === "horizontal" ? "x" : "y";
    const offset = reverse ? -distance : distance;
    const startPct = (1 - threshold) * 100;

    gsap.set(el, {
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
      visibility: "visible",
    });

    const tl = gsap.timeline({ paused: true, delay });
    tl.to(el, { [axis]: 0, scale: 1, opacity: 1, duration, ease });

    const st = ScrollTrigger.create({
      trigger: el,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play(),
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, [
    reduced,
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
  ]);

  // Reduced motion (or before hydration): render visible, no transform.
  return (
    <div
      ref={ref}
      className={reduced ? className : `invisible ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedContent;
