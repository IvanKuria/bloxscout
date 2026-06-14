import {
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  DEVEX_PAYOUT_MINIMUM_ROBUX,
  LEGACY_DEVEX_RATE_USD_PER_ROBUX,
  REVENUE_ESTIMATE_DISCLAIMER,
  calculateDevex,
  estimateGameRevenue,
} from "@bloxscout/core/calculators";
import { BloxscoutError } from "@bloxscout/core/errors";
import { describe, expect, it } from "vitest";

describe("calculateDevex", () => {
  it("converts robux to USD at the default rate", () => {
    const result = calculateDevex(100_000);
    expect(result.rateUsdPerRobux).toBe(DEFAULT_DEVEX_RATE_USD_PER_ROBUX);
    expect(result.usd).toBe(380);
    expect(result.robux).toBe(100_000);
    expect(result.payoutMinimumNotMet).toBeUndefined();
  });

  it("returns 0 USD for 0 robux and flags payout minimum not met", () => {
    const result = calculateDevex(0);
    expect(result.usd).toBe(0);
    expect(result.payoutMinimumNotMet).toBe(true);
  });

  it("flags below-minimum balances and does not flag at-minimum", () => {
    expect(calculateDevex(29_999).payoutMinimumNotMet).toBe(true);
    expect(calculateDevex(DEVEX_PAYOUT_MINIMUM_ROBUX).payoutMinimumNotMet).toBeUndefined();
    expect(calculateDevex(DEVEX_PAYOUT_MINIMUM_ROBUX + 1).payoutMinimumNotMet).toBeUndefined();
  });

  it("honors a custom rate (e.g. legacy pre-2025-09-05 rate)", () => {
    const result = calculateDevex(100_000, { rateUsdPerRobux: LEGACY_DEVEX_RATE_USD_PER_ROBUX });
    expect(result.rateUsdPerRobux).toBe(0.0035);
    expect(result.usd).toBe(350);
  });

  it("rounds to two decimal places (DevEx pays dollars and cents)", () => {
    const result = calculateDevex(1, { rateUsdPerRobux: 0.0037 });
    // 0.0037 -> rounds to 0.00 (display-friendly)
    expect(result.usd).toBe(0);
    const result2 = calculateDevex(123, { rateUsdPerRobux: 0.01 });
    expect(result2.usd).toBe(1.23);
  });

  it("throws VALIDATION_ERROR on negative robux", () => {
    expect(() => calculateDevex(-1)).toThrow(BloxscoutError);
    try {
      calculateDevex(-1);
    } catch (err) {
      expect((err as BloxscoutError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("throws on non-finite robux", () => {
    expect(() => calculateDevex(Number.NaN)).toThrow(BloxscoutError);
    expect(() => calculateDevex(Number.POSITIVE_INFINITY)).toThrow(BloxscoutError);
  });

  it("throws on non-positive rate override", () => {
    expect(() => calculateDevex(1000, { rateUsdPerRobux: 0 })).toThrow(BloxscoutError);
    expect(() => calculateDevex(1000, { rateUsdPerRobux: -0.01 })).toThrow(BloxscoutError);
  });
});

describe("estimateGameRevenue", () => {
  it("applies the documented formula with default knobs", () => {
    const result = estimateGameRevenue({ playing: 1_000, visits: 500_000 });
    // 1000 * 0.02 * 100 = 2000 Robux/day
    expect(result.estimatedDailyRobux).toBe(2_000);
    // 2000 * 30 = 60_000 Robux/month
    expect(result.estimatedMonthlyRobux).toBe(60_000);
    // 60_000 * 0.0038 = 228 USD
    expect(result.estimatedMonthlyUsd).toBe(228);
    expect(result.confidence).toBe("low");
    expect(result.disclaimer).toBe(REVENUE_ESTIMATE_DISCLAIMER);
    expect(result.assumptions.length).toBeGreaterThanOrEqual(4);
  });

  it("scales linearly with CCU", () => {
    const small = estimateGameRevenue({ playing: 100, visits: 0 });
    const big = estimateGameRevenue({ playing: 10_000, visits: 0 });
    expect(big.estimatedMonthlyRobux / small.estimatedMonthlyRobux).toBe(100);
  });

  it("returns zeros for zero CCU", () => {
    const result = estimateGameRevenue({ playing: 0, visits: 0 });
    expect(result.estimatedDailyRobux).toBe(0);
    expect(result.estimatedMonthlyRobux).toBe(0);
    expect(result.estimatedMonthlyUsd).toBe(0);
  });

  it("honors custom monetization knobs", () => {
    const result = estimateGameRevenue(
      { playing: 1_000, visits: 0 },
      { conversionRate: 0.05, averageRobuxPerPayingUser: 200, daysActive: 7 },
    );
    // 1000 * 0.05 * 200 = 10_000 daily; 7 days = 70_000 Robux
    expect(result.estimatedDailyRobux).toBe(10_000);
    expect(result.estimatedMonthlyRobux).toBe(70_000);
    expect(result.inputs.conversionRate).toBe(0.05);
    expect(result.inputs.averageRobuxPerPayingUser).toBe(200);
    expect(result.inputs.daysActive).toBe(7);
  });

  it("uses a caller-supplied DevEx rate when provided", () => {
    const result = estimateGameRevenue(
      { playing: 1_000, visits: 0 },
      { rateUsdPerRobux: LEGACY_DEVEX_RATE_USD_PER_ROBUX },
    );
    expect(result.inputs.rateUsdPerRobux).toBe(0.0035);
    // 60_000 Robux/month * 0.0035 = 210 USD
    expect(result.estimatedMonthlyUsd).toBe(210);
  });

  it("rejects out-of-range conversion rates", () => {
    expect(() => estimateGameRevenue({ playing: 100, visits: 0 }, { conversionRate: 1.5 })).toThrow(
      BloxscoutError,
    );
    expect(() =>
      estimateGameRevenue({ playing: 100, visits: 0 }, { conversionRate: -0.1 }),
    ).toThrow(BloxscoutError);
  });

  it("rejects negative or non-finite CCU", () => {
    expect(() => estimateGameRevenue({ playing: -1, visits: 0 })).toThrow(BloxscoutError);
    expect(() => estimateGameRevenue({ playing: Number.NaN, visits: 0 })).toThrow(BloxscoutError);
  });

  it("rejects non-positive daysActive", () => {
    expect(() => estimateGameRevenue({ playing: 100, visits: 0 }, { daysActive: 0 })).toThrow(
      BloxscoutError,
    );
    expect(() => estimateGameRevenue({ playing: 100, visits: 0 }, { daysActive: -1 })).toThrow(
      BloxscoutError,
    );
  });

  it("includes the prominent disclaimer string verbatim", () => {
    const result = estimateGameRevenue({ playing: 500, visits: 1_000 });
    expect(result.disclaimer).toContain("Heuristic estimate");
    expect(result.disclaimer).toContain("5-10x");
  });

  it("preserves daysActive=1 (daily estimate)", () => {
    const result = estimateGameRevenue({ playing: 1_000, visits: 0 }, { daysActive: 1 });
    expect(result.estimatedDailyRobux).toBe(2_000);
    expect(result.estimatedMonthlyRobux).toBe(2_000);
  });
});
