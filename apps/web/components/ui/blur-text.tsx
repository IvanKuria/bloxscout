"use client";

/**
 * BlurText — a restrained, word-by-word reveal (adapted from reactbits
 * `BlurText`, motion/framer-only, no GSAP). Used for the hero headline: each
 * word lifts and de-blurs in a short stagger when it enters the viewport.
 *
 * SSR-safe: motion renders each span on the server with its `initial` style
 * inlined, so the server markup and the client's first paint match (no
 * hydration mismatch). Reduced-motion-safe: when the user prefers reduced
 * motion, spans render in their resolved (visible) state with no animation.
 */
import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

type BlurTextProps = {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  threshold?: number;
  rootMargin?: string;
  stepDuration?: number;
};

const FROM = { filter: "blur(8px)", opacity: 0, y: 16 };
const TO = [
  { filter: "blur(4px)", opacity: 0.6, y: 4 },
  { filter: "blur(0px)", opacity: 1, y: 0 },
] as const;

function buildKeyframes() {
  const keys = new Set<string>([
    ...Object.keys(FROM),
    ...TO.flatMap((s) => Object.keys(s)),
  ]);
  const out: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    out[k] = [
      (FROM as Record<string, string | number>)[k],
      ...TO.map((s) => (s as Record<string, string | number>)[k]),
    ];
  });
  return out;
}

export function BlurText({
  text,
  delay = 90,
  className = "",
  animateBy = "words",
  threshold = 0.15,
  rootMargin = "0px",
  stepDuration = 0.34,
}: BlurTextProps) {
  const segments = animateBy === "words" ? text.split(" ") : text.split("");
  const reduced = useReducedMotion();

  const stepCount = TO.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1),
  );
  const keyframes = buildKeyframes();

  // Reduced motion: render visible, no animation.
  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className} style={{ display: "inline" }}>
      {segments.map((segment, index) => {
        const transition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: [0.22, 1, 0.36, 1],
        };
        return (
          <motion.span
            key={index}
            initial={FROM}
            whileInView={keyframes}
            viewport={{ once: true, amount: threshold, margin: rootMargin }}
            transition={transition}
            style={{
              display: "inline-block",
              willChange: "transform, filter, opacity",
            }}
          >
            {segment === " " ? " " : segment}
            {animateBy === "words" && index < segments.length - 1 && " "}
          </motion.span>
        );
      })}
    </span>
  );
}

export default BlurText;
