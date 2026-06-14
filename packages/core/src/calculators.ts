/**
 * Pure financial calculators for Bloxscout. No IO, no caching, no network —
 * deterministic functions of their inputs. Both the MCP tool layer and the
 * CLI consume these directly.
 */

import { BloxscoutError } from "./errors.js";

/**
 * Current Roblox Developer Exchange (DevEx) rate, in USD per Earned Robux.
 *
 * Roblox raised the DevEx rate from $0.0035 to $0.0038 per Robux on
 * 2025-09-05 (10:00 AM PT). Earned Robux accrued after that cutoff cash out
 * at the new rate; Robux earned before the cutoff cash out at the legacy
 * rate (`0.0035`). v0.1 uses the post-cutoff rate as the default — callers
 * who need the legacy rate can pass `rateUsdPerRobux: 0.0035`.
 *
 * Source: Roblox Developer Exchange help article
 *   https://en.help.roblox.com/hc/en-us/articles/13061189551124-Developer-Exchange-Help-and-Information-Page
 */
export const DEFAULT_DEVEX_RATE_USD_PER_ROBUX = 0.0038;

/** Legacy pre-2025-09-05 DevEx rate, exposed for callers that need it. */
export const LEGACY_DEVEX_RATE_USD_PER_ROBUX = 0.0035;

/**
 * Minimum Earned Robux balance required to file a DevEx payout request, per
 * Roblox's documented program rules. Below this threshold the developer
 * cannot cash out.
 */
export const DEVEX_PAYOUT_MINIMUM_ROBUX = 30_000;

export interface CalculateDevexOptions {
  /** Override the USD-per-Robux rate. Defaults to {@link DEFAULT_DEVEX_RATE_USD_PER_ROBUX}. */
  rateUsdPerRobux?: number;
}

export interface DevexResult {
  /** Echoed input. */
  robux: number;
  /** Robux * rateUsdPerRobux, rounded to 2 decimals. */
  usd: number;
  /** The rate that was actually applied. */
  rateUsdPerRobux: number;
  /** `true` when `robux` is below the DevEx payout minimum (30,000 Robux). */
  payoutMinimumNotMet?: boolean;
}

/**
 * Convert a Robux balance to its USD equivalent at the current DevEx rate.
 *
 * The result is rounded to two decimal places — DevEx payouts are dollars
 * and cents, not fractions of a cent.
 */
export function calculateDevex(robux: number, opts: CalculateDevexOptions = {}): DevexResult {
  if (!Number.isFinite(robux)) {
    throw new BloxscoutError("calculateDevex: robux must be a finite number", "VALIDATION_ERROR");
  }
  if (robux < 0) {
    throw new BloxscoutError("calculateDevex: robux must be non-negative", "VALIDATION_ERROR");
  }
  const rate = opts.rateUsdPerRobux ?? DEFAULT_DEVEX_RATE_USD_PER_ROBUX;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new BloxscoutError(
      "calculateDevex: rateUsdPerRobux must be a positive number",
      "VALIDATION_ERROR",
    );
  }
  const usd = round2(robux * rate);
  const result: DevexResult = { robux, usd, rateUsdPerRobux: rate };
  if (robux < DEVEX_PAYOUT_MINIMUM_ROBUX) {
    result.payoutMinimumNotMet = true;
  }
  return result;
}

export interface EstimateGameRevenueInput {
  /** Current concurrent players (CCU). Non-negative integer. */
  playing: number;
  /** All-time visits. Non-negative integer. Currently informational only. */
  visits: number;
}

export interface EstimateGameRevenueOptions {
  /**
   * Fraction of CCU that converts to a paying user on a given day. Default
   * 0.02 (2%). Roblox does not publish per-game conversion; 1-3% is the
   * commonly-cited industry band for free-to-play mobile-shaped products.
   */
  conversionRate?: number;
  /**
   * Average Robux spent per paying user per active day. Default 100 Robux
   * (roughly the price of a mid-tier gamepass, spread). Highly genre and
   * monetization-design dependent.
   */
  averageRobuxPerPayingUser?: number;
  /**
   * Number of days the estimate covers. Default 30 (estimated monthly
   * revenue). Use 1 for a daily figure, 365 for an annualized one.
   */
  daysActive?: number;
  /** Override the DevEx rate used to convert estimated Robux to USD. */
  rateUsdPerRobux?: number;
}

export interface EstimateGameRevenueResult {
  /** Echoed input + the option values actually applied. */
  inputs: {
    playing: number;
    visits: number;
    conversionRate: number;
    averageRobuxPerPayingUser: number;
    daysActive: number;
    rateUsdPerRobux: number;
  };
  /** `playing * conversionRate * averageRobuxPerPayingUser`. */
  estimatedDailyRobux: number;
  /** `estimatedDailyRobux * daysActive`. */
  estimatedMonthlyRobux: number;
  /** USD value of `estimatedMonthlyRobux` at the supplied DevEx rate. */
  estimatedMonthlyUsd: number;
  /** Always `"low"` in v0.1 — this is a heuristic. */
  confidence: "low" | "medium" | "high";
  /** Human-readable list of assumptions baked into the estimate. */
  assumptions: string[];
  /** Disclaimer shown to end users / agents — variance is large. */
  disclaimer: string;
}

const REVENUE_DISCLAIMER =
  "Heuristic estimate based on platform averages. Actual revenue varies by 5-10x depending on monetization design, gamepass pricing, and conversion.";

/**
 * Estimate gross revenue from live game stats. Pure function; no IO.
 *
 * Formula:
 *   estimatedDailyRobux  = playing * conversionRate * averageRobuxPerPayingUser
 *   estimatedMonthlyRobux = estimatedDailyRobux * daysActive
 *   estimatedMonthlyUsd   = calculateDevex(estimatedMonthlyRobux).usd
 *
 * Returns an explicit assumption list and a prominent disclaimer because the
 * underlying constants vary by an order of magnitude across real games.
 */
export function estimateGameRevenue(
  game: EstimateGameRevenueInput,
  opts: EstimateGameRevenueOptions = {},
): EstimateGameRevenueResult {
  if (!Number.isFinite(game.playing) || game.playing < 0) {
    throw new BloxscoutError(
      "estimateGameRevenue: game.playing must be a non-negative finite number",
      "VALIDATION_ERROR",
    );
  }
  if (!Number.isFinite(game.visits) || game.visits < 0) {
    throw new BloxscoutError(
      "estimateGameRevenue: game.visits must be a non-negative finite number",
      "VALIDATION_ERROR",
    );
  }
  const conversionRate = opts.conversionRate ?? 0.02;
  if (!Number.isFinite(conversionRate) || conversionRate < 0 || conversionRate > 1) {
    throw new BloxscoutError(
      "estimateGameRevenue: conversionRate must be a number in [0, 1]",
      "VALIDATION_ERROR",
    );
  }
  const averageRobuxPerPayingUser = opts.averageRobuxPerPayingUser ?? 100;
  if (!Number.isFinite(averageRobuxPerPayingUser) || averageRobuxPerPayingUser < 0) {
    throw new BloxscoutError(
      "estimateGameRevenue: averageRobuxPerPayingUser must be non-negative",
      "VALIDATION_ERROR",
    );
  }
  const daysActive = opts.daysActive ?? 30;
  if (!Number.isFinite(daysActive) || daysActive <= 0) {
    throw new BloxscoutError(
      "estimateGameRevenue: daysActive must be a positive number",
      "VALIDATION_ERROR",
    );
  }
  const rateUsdPerRobux = opts.rateUsdPerRobux ?? DEFAULT_DEVEX_RATE_USD_PER_ROBUX;

  const estimatedDailyRobux = round2(game.playing * conversionRate * averageRobuxPerPayingUser);
  const estimatedMonthlyRobux = round2(estimatedDailyRobux * daysActive);
  const { usd: estimatedMonthlyUsd } = calculateDevex(estimatedMonthlyRobux, { rateUsdPerRobux });

  return {
    inputs: {
      playing: game.playing,
      visits: game.visits,
      conversionRate,
      averageRobuxPerPayingUser,
      daysActive,
      rateUsdPerRobux,
    },
    estimatedDailyRobux,
    estimatedMonthlyRobux,
    estimatedMonthlyUsd,
    confidence: "low",
    assumptions: [
      `${(conversionRate * 100).toFixed(2)}% of concurrent players convert to a paying user on a given active day`,
      `Each paying user spends an average of ${averageRobuxPerPayingUser} Robux per active day`,
      `Estimate covers ${daysActive} active day(s) at the same CCU as the input`,
      `Robux-to-USD conversion uses the DevEx rate of ${rateUsdPerRobux} USD per Robux`,
      "All-time visits are not used in the formula — included for context only",
    ],
    disclaimer: REVENUE_DISCLAIMER,
  };
}

/** Shared disclaimer string — exported so tool descriptions stay in sync with the result payload. */
export const REVENUE_ESTIMATE_DISCLAIMER = REVENUE_DISCLAIMER;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
