import {
  computeVirality,
  playerVelocitySubscore,
  recencySubscore,
  receptionSubscore,
  reviewVelocitySubscore,
} from "@bloxscout/core/steam-virality";
import { describe, expect, it } from "vitest";

describe("reviewVelocitySubscore", () => {
  it("is 0 when unavailable or non-positive", () => {
    expect(reviewVelocitySubscore(null)).toBe(0);
    expect(reviewVelocitySubscore(0)).toBe(0);
    expect(reviewVelocitySubscore(-5)).toBe(0);
  });

  it("is ~0.5 at the midpoint and rises monotonically", () => {
    expect(reviewVelocitySubscore(2000)).toBeCloseTo(0.5, 6);
    expect(reviewVelocitySubscore(500)).toBeLessThan(reviewVelocitySubscore(5000));
  });

  it("stays within [0, 1]", () => {
    for (const v of [1, 100, 2000, 50000]) {
      const s = reviewVelocitySubscore(v);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("playerVelocitySubscore", () => {
  it("is 0 when unavailable or non-positive", () => {
    expect(playerVelocitySubscore(null)).toBe(0);
    expect(playerVelocitySubscore(0)).toBe(0);
  });

  it("rewards faster growth and caps runaway values", () => {
    expect(playerVelocitySubscore(0.1)).toBeLessThan(playerVelocitySubscore(2));
    // Beyond the cap the score should not keep climbing.
    expect(playerVelocitySubscore(50)).toBeCloseTo(playerVelocitySubscore(10), 10);
  });
});

describe("recencySubscore", () => {
  it("is 0 when age unknown", () => {
    expect(recencySubscore(null)).toBe(0);
  });

  it("is 1 at launch and decays with age", () => {
    expect(recencySubscore(0)).toBeCloseTo(1, 10);
    // ~5-day-old launch (MECCHA CHAMELEON case) still scores high.
    expect(recencySubscore(5)).toBeGreaterThan(0.8);
    // A year old is essentially cold.
    expect(recencySubscore(365)).toBeLessThan(0.01);
    expect(recencySubscore(10)).toBeLessThan(recencySubscore(5));
  });

  it("treats negative age as launch", () => {
    expect(recencySubscore(-3)).toBeCloseTo(1, 10);
  });
});

describe("receptionSubscore", () => {
  it("is 0 when positivePct unknown", () => {
    expect(receptionSubscore(null, 1000)).toBe(0);
  });

  it("discounts high ratios on tiny review counts", () => {
    // 95% on 20 reviews → 0.95 * (20/500) = 0.038
    expect(receptionSubscore(0.95, 20)).toBeCloseTo(0.95 * (20 / 500), 6);
    // 95% on 1000 reviews → fully trusted = 0.95
    expect(receptionSubscore(0.95, 1000)).toBeCloseTo(0.95, 6);
  });

  it("clamps pct into [0,1] and floors negative counts", () => {
    expect(receptionSubscore(1.5, 1000)).toBeCloseTo(1, 6);
    expect(receptionSubscore(0.9, -10)).toBe(0);
  });
});

describe("computeVirality", () => {
  it("returns 0 when every signal is missing", () => {
    const r = computeVirality({
      reviewVelocityPerDay: null,
      playerVelocityPct: null,
      ageDays: null,
      positivePct: null,
      reviewTotal: null,
    });
    expect(r.viralityScore).toBe(0);
    expect(r.components).toEqual({
      reviewVelocity: 0,
      playerVelocity: 0,
      recency: 0,
      reception: 0,
    });
  });

  it("scores a MECCHA-CHAMELEON-like breakout near the top", () => {
    // huge review velocity, strong player growth, 5 days old, loved on big N.
    const r = computeVirality({
      reviewVelocityPerDay: 8000,
      playerVelocityPct: 1.2,
      ageDays: 5,
      positivePct: 0.95,
      reviewTotal: 40000,
    });
    expect(r.viralityScore).toBeGreaterThan(80);
    expect(r.viralityScore).toBeLessThanOrEqual(100);
  });

  it("ranks a fast riser above a stale, slow game", () => {
    const hot = computeVirality({
      reviewVelocityPerDay: 6000,
      playerVelocityPct: 1.0,
      ageDays: 3,
      positivePct: 0.9,
      reviewTotal: 10000,
    });
    const stale = computeVirality({
      reviewVelocityPerDay: 5,
      playerVelocityPct: 0.01,
      ageDays: 800,
      positivePct: 0.9,
      reviewTotal: 10000,
    });
    expect(hot.viralityScore).toBeGreaterThan(stale.viralityScore);
  });

  it("never exceeds 100 even when all signals are maxed", () => {
    const r = computeVirality({
      reviewVelocityPerDay: 1e6,
      playerVelocityPct: 1e6,
      ageDays: 0,
      positivePct: 1,
      reviewTotal: 1e6,
    });
    expect(r.viralityScore).toBeLessThanOrEqual(100);
    expect(r.viralityScore).toBeGreaterThan(99);
  });
});
