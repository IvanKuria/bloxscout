import { herfindahlIndex, logistic, topNShare } from "@bloxscout/core/concentration";
import { describe, expect, it } from "vitest";

describe("herfindahlIndex", () => {
  it("returns 0 for empty input", () => {
    expect(herfindahlIndex([])).toBe(0);
  });

  it("returns 1 for a single value (one player owns everything)", () => {
    expect(herfindahlIndex([500])).toBe(1);
  });

  it("returns ~1 when one game dominates", () => {
    // 1000 vs four 1s — almost all share in one.
    expect(herfindahlIndex([1000, 1, 1, 1, 1])).toBeGreaterThan(0.98);
  });

  it("returns 1/n for an even distribution", () => {
    // n equal shares → Σ(1/n)² = n * 1/n² = 1/n.
    expect(herfindahlIndex([100, 100, 100, 100])).toBeCloseTo(0.25, 10);
    expect(herfindahlIndex([10, 10])).toBeCloseTo(0.5, 10);
  });

  it("ignores the scale of the inputs (shares only)", () => {
    expect(herfindahlIndex([2, 2, 2, 2])).toBeCloseTo(0.25, 10);
  });

  it("returns 0 when the total is 0", () => {
    expect(herfindahlIndex([0, 0, 0])).toBe(0);
  });

  it("clamps negative values to 0 before computing shares", () => {
    // Negatives treated as 0 → equivalent to [100, 100].
    expect(herfindahlIndex([100, 100, -50])).toBeCloseTo(0.5, 10);
  });
});

describe("topNShare", () => {
  it("returns 0 for empty input", () => {
    expect(topNShare([], 3)).toBe(0);
  });

  it("returns 0 when the total is 0", () => {
    expect(topNShare([0, 0], 1)).toBe(0);
  });

  it("returns the share held by the single largest value", () => {
    // top1 of [600, 300, 100] = 600/1000.
    expect(topNShare([300, 600, 100], 1)).toBeCloseTo(0.6, 10);
  });

  it("returns the summed share of the top N", () => {
    // top3 of [600, 300, 100, 50, 50] = 1000/1100.
    expect(topNShare([600, 300, 100, 50, 50], 3)).toBeCloseTo(1000 / 1100, 10);
  });

  it("returns 1 when n >= count", () => {
    expect(topNShare([10, 20, 30], 5)).toBeCloseTo(1, 10);
  });

  it("returns 0 for n <= 0", () => {
    expect(topNShare([10, 20, 30], 0)).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(topNShare([100, 100, -100], 1)).toBeCloseTo(0.5, 10);
  });
});

describe("logistic", () => {
  it("returns 0.5 at the midpoint", () => {
    expect(logistic(1, 1, 2)).toBeCloseTo(0.5, 10);
    expect(logistic(0, 0, 8)).toBeCloseTo(0.5, 10);
  });

  it("approaches 1 well above the midpoint", () => {
    expect(logistic(10, 1, 2)).toBeGreaterThan(0.99);
  });

  it("approaches 0 well below the midpoint", () => {
    expect(logistic(-10, 1, 2)).toBeLessThan(0.01);
  });

  it("is monotonically increasing in x", () => {
    const a = logistic(0.5, 1, 4);
    const b = logistic(1.0, 1, 4);
    const c = logistic(1.5, 1, 4);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("stays within [0, 1] (open interior, may saturate to 0/1 in FP at extremes)", () => {
    for (const x of [-100, -1, 0, 1, 100]) {
      const y = logistic(x, 0.3, 5);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    // At moderate distances it is strictly interior.
    const mid = logistic(2, 0.3, 5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
