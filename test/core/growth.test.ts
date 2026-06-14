import {
  type GrowthPoint,
  growthRate,
  windowGrowthPct,
  zScoreOfLatest,
} from "@bloxscout/core/growth";
import { describe, expect, it } from "vitest";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function pt(t: number, value: number): GrowthPoint {
  return { t, value };
}

describe("growthRate", () => {
  it("computes (current - baseline) / baseline", () => {
    expect(growthRate(100, 150)).toBe(0.5);
    expect(growthRate(200, 100)).toBe(-0.5);
  });

  it("returns 0 when both baseline and current are 0", () => {
    expect(growthRate(0, 0)).toBe(0);
  });

  it("returns Infinity when baseline is 0 and current is positive", () => {
    expect(growthRate(0, 5)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("windowGrowthPct", () => {
  const now = Date.parse("2026-06-12T00:00:00Z");

  it("returns null when fewer than 2 points fall inside the window", () => {
    expect(windowGrowthPct([], DAY, now)).toBeNull();
    expect(windowGrowthPct([pt(now - HOUR, 100)], DAY, now)).toBeNull();
    // Two points, but only one inside the window.
    expect(windowGrowthPct([pt(now - 2 * DAY, 100), pt(now - HOUR, 150)], DAY, now)).toBeNull();
  });

  it("computes growth from oldest to newest point inside the window", () => {
    const points = [pt(now - 20 * HOUR, 100), pt(now - 10 * HOUR, 130), pt(now - HOUR, 150)];
    expect(windowGrowthPct(points, DAY, now)).toBe(0.5);
  });

  it("ignores points older than the window", () => {
    const points = [pt(now - 3 * DAY, 10), pt(now - 20 * HOUR, 100), pt(now - HOUR, 150)];
    expect(windowGrowthPct(points, DAY, now)).toBe(0.5);
  });

  it("tolerates unsorted input", () => {
    const points = [pt(now - HOUR, 150), pt(now - 20 * HOUR, 100)];
    expect(windowGrowthPct(points, DAY, now)).toBe(0.5);
  });
});

describe("zScoreOfLatest", () => {
  it("returns null with fewer than 4 values", () => {
    expect(zScoreOfLatest([])).toBeNull();
    expect(zScoreOfLatest([1, 2, 3])).toBeNull();
  });

  it("computes the z-score of the last value against the preceding values", () => {
    // prior = [10, 12, 11, 13]: mean 11.5, population std sqrt(1.25).
    expect(zScoreOfLatest([10, 12, 11, 13, 14])).toBeCloseTo(2.2360679, 5);
  });

  it("returns 0 when the series is flat", () => {
    expect(zScoreOfLatest([100, 100, 100, 100])).toBe(0);
  });

  it("clamps to ±10 by default so results stay JSON-serializable", () => {
    // Flat prior + spike would otherwise divide by zero.
    expect(zScoreOfLatest([100, 100, 100, 5000])).toBe(10);
    expect(zScoreOfLatest([100, 100, 100, 0])).toBe(-10);
    // Huge but finite z also clamps.
    expect(zScoreOfLatest([10, 12, 11, 13, 12, 3000])).toBe(10);
  });

  it("honours a custom clamp", () => {
    expect(zScoreOfLatest([100, 100, 100, 5000], { clamp: 3 })).toBe(3);
  });
});
