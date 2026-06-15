"use client";

/**
 * FadeContent — a restrained scroll-reveal entrance (motion/framer `whileInView`).
 * Children lift a few px and fade in once when scrolled into view, on a gentle
 * cubic-bezier. SSR-safe: motion renders the element on the server with its
 * `initial` style applied via CSS, and reveals on the client. Reduced-motion
 * collapses the offset/opacity so content is simply present.
 *
 * Used across the marketing surface for editorial feature rows and cards.
 */
import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

type FadeContentProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in seconds (e.g. for sequential rows). */
  delay?: number;
  /** Travel distance in px before settling. */
  y?: number;
  /** Animate horizontally instead. */
  x?: number;
  as?: "div" | "li" | "section" | "article";
};

export function FadeContent({
  children,
  className,
  delay = 0,
  y = 18,
  x = 0,
  as = "div",
}: FadeContentProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={reduced ? { opacity: 1 } : { opacity: 0, y, x }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  );
}

export default FadeContent;
