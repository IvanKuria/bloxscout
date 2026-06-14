// Vendored from fancycomponents.dev (danielpetho/fancy) — "Image Trail".
// author: Khoa Phan <https://www.pldkhoa.dev>
//
// Renders a trail of recycled elements that follow the pointer. SSR-safe: all
// pointer reads happen in the React `onMouseMove` handler, never during render.

"use client";

import React, { ElementType, HTMLAttributes, useEffect, useMemo } from "react";
import type { DOMKeyframesDefinition, AnimationOptions } from "motion";
import { useAnimate } from "motion/react";

import { cn } from "@/lib/utils";

interface ImageTrailProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: ElementType;
  /** Distance in px the pointer must travel to spawn the next trail element. */
  threshold?: number;
  /** Momentum after spawning. Clamped to (0, 1]. Defaults to 0.3. */
  intensity?: number;
  keyframes?: DOMKeyframesDefinition;
  keyframesOptions?: AnimationOptions;
  trailElementAnimationKeyframes?: {
    x?: AnimationOptions;
    y?: AnimationOptions;
  };
  /** Times the children are repeated into the recyclable pool. Defaults to 3. */
  repeatChildren?: number;
  baseZIndex?: number;
  zIndexDirection?: "new-on-top" | "old-on-top";
}

interface ImageTrailItemProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  children: React.ReactNode;
}

const MathUtils = {
  lerp: (a: number, b: number, n: number) => (1 - n) * a + n * b,
  distance: (x1: number, y1: number, x2: number, y2: number) =>
    Math.hypot(x2 - x1, y2 - y1),
};

const ImageTrail = ({
  className,
  as = "div",
  children,
  threshold = 100,
  intensity = 0.3,
  keyframes,
  keyframesOptions,
  repeatChildren = 3,
  trailElementAnimationKeyframes = {
    x: { duration: 1, type: "tween", ease: "easeOut" },
    y: { duration: 1, type: "tween", ease: "easeOut" },
  },
  baseZIndex = 0,
  zIndexDirection = "new-on-top",
  ...props
}: ImageTrailProps) => {
  const allImages = React.useRef<NodeListOf<HTMLElement>>(undefined);
  const currentId = React.useRef(0);
  const lastMousePos = React.useRef({ x: 0, y: 0 });
  const cachedMousePos = React.useRef({ x: 0, y: 0 });
  const [containerRef, animate] = useAnimate();
  const zIndices = React.useRef<number[]>([]);

  const clampedIntensity = useMemo(
    () => Math.max(0.0001, Math.min(1, intensity)),
    [intensity],
  );

  useEffect(() => {
    allImages.current = containerRef?.current?.querySelectorAll(
      ".image-trail-item",
    ) as NodeListOf<HTMLElement>;

    zIndices.current = Array.from(
      { length: allImages.current.length },
      (_, index) => index,
    );
  }, [containerRef, allImages]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const containerRect = containerRef?.current?.getBoundingClientRect();
    const mousePos = {
      x: e.clientX - (containerRect?.left || 0),
      y: e.clientY - (containerRect?.top || 0),
    };

    cachedMousePos.current.x = MathUtils.lerp(
      cachedMousePos.current.x || mousePos.x,
      mousePos.x,
      clampedIntensity,
    );

    cachedMousePos.current.y = MathUtils.lerp(
      cachedMousePos.current.y || mousePos.y,
      mousePos.y,
      clampedIntensity,
    );

    const distance = MathUtils.distance(
      mousePos.x,
      mousePos.y,
      lastMousePos.current.x,
      lastMousePos.current.y,
    );

    if (distance > threshold && allImages?.current) {
      const N = allImages.current.length;
      const current = currentId.current;

      if (zIndexDirection === "new-on-top") {
        for (let i = 0; i < N; i++) {
          if (i !== current) {
            zIndices.current[i] -= 1;
          }
        }
        zIndices.current[current] = N - 1;
      } else {
        for (let i = 0; i < N; i++) {
          if (i !== current) {
            zIndices.current[i] += 1;
          }
        }
        zIndices.current[current] = 0;
      }

      allImages.current[current].style.display = "block";
      allImages.current.forEach((img, index) => {
        img.style.zIndex = String(zIndices.current[index] + baseZIndex);
      });

      animate(
        allImages.current[currentId.current],
        {
          x: [
            cachedMousePos.current.x -
              allImages.current[currentId.current].offsetWidth / 2,
            mousePos.x - allImages.current[currentId.current].offsetWidth / 2,
          ],
          y: [
            cachedMousePos.current.y -
              allImages.current[currentId.current].offsetHeight / 2,
            mousePos.y -
              allImages.current?.[currentId.current].offsetHeight / 2,
          ],
          ...keyframes,
        },
        {
          ...trailElementAnimationKeyframes.x,
          ...trailElementAnimationKeyframes.y,
          ...keyframesOptions,
        },
      );
      currentId.current = (current + 1) % N;
      lastMousePos.current = { x: mousePos.x, y: mousePos.y };
    }
  };

  const ElementTag = as ?? "div";

  return (
    <ElementTag
      className={cn("h-full w-full relative", className)}
      onMouseMove={handleMouseMove}
      ref={containerRef}
      {...props}
    >
      {Array.from({ length: repeatChildren }).map((_, i) => (
        <React.Fragment key={i}>{children}</React.Fragment>
      ))}
    </ElementTag>
  );
};

export const ImageTrailItem = ({
  className,
  children,
  as = "div",
  ...props
}: ImageTrailItemProps) => {
  const ElementTag = as ?? "div";
  return (
    <ElementTag
      {...props}
      className={cn(
        "absolute top-0 left-0 will-change-transform hidden",
        className,
        "image-trail-item",
      )}
    >
      {children}
    </ElementTag>
  );
};

export default ImageTrail;
