/**
 * Pure virality-velocity scoring for external (off-platform) games surfaced by
 * the cross-platform "replicate-this" radar. No IO, no state — callers pass the
 * raw signals already gathered from Steam (review/player velocity, age,
 * reception) and get back a 0-100 score plus the normalized sub-scores so the
 * agent and UI can reason over the raw inputs (mirrors `RisingNicheEntry.components`).
 *
 * Shared by the pipeline stage (`pipeline/steam-breakouts.ts`) so the scoring
 * lives in one tested place — the analog of `concentration.ts` / `growth.ts`.
 */
import { logistic } from "./concentration";

/** Inputs to the virality score. `null` means "signal unavailable". */
export interface ViralitySignals {
  /** Δreviews / Δdays between the two most recent observations (or launch-to-date on first sight). */
  reviewVelocityPerDay: number | null;
  /** Relative player-count growth between observations, e.g. 0.5 = +50%. */
  playerVelocityPct: number | null;
  /** Days since the game released; `null` when the release date is unknown/unparseable. */
  ageDays: number | null;
  /** Positive-review fraction in [0, 1]. */
  positivePct: number | null;
  /** Total review count (gates how much we trust `positivePct`). */
  reviewTotal: number | null;
}

export interface ViralityComponents {
  reviewVelocity: number;
  playerVelocity: number;
  recency: number;
  reception: number;
}

export interface ViralityResult {
  /** 0-100 blended score. */
  viralityScore: number;
  components: ViralityComponents;
}

// --- tunable constants (documented so the weights are reviewable) ---

/** reviews/day at which the review-velocity sub-score crosses 0.5. */
const REVIEW_VELOCITY_MIDPOINT = 2000;
/** Logistic steepness for review velocity (gentle — the domain spans 0..10k+/day). */
const REVIEW_VELOCITY_STEEPNESS = 0.001;

/** Relative player growth at which the player-velocity sub-score crosses 0.5 (=+50%). */
const PLAYER_VELOCITY_MIDPOINT = 0.5;
const PLAYER_VELOCITY_STEEPNESS = 3;
/** Cap runaway player growth so a tiny prior baseline can't dominate. */
const PLAYER_VELOCITY_CAP = 10;

/** Recency half-life-ish constant (days): a 5-day launch ≈ 0.85, a year ≈ 0. */
const RECENCY_TAU_DAYS = 30;

/** Review count at/above which `positivePct` is fully trusted. */
const RECEPTION_FULL_TRUST_REVIEWS = 500;

const WEIGHTS = {
  reviewVelocity: 0.45,
  playerVelocity: 0.25,
  recency: 0.2,
  reception: 0.1,
} as const;

/** Review-velocity sub-score in [0, 1]; 0 when unavailable or non-positive. */
export function reviewVelocitySubscore(reviewVelocityPerDay: number | null): number {
  if (reviewVelocityPerDay === null || reviewVelocityPerDay <= 0) return 0;
  return logistic(
    reviewVelocityPerDay,
    REVIEW_VELOCITY_MIDPOINT,
    REVIEW_VELOCITY_STEEPNESS,
  );
}

/** Player-velocity sub-score in [0, 1]; 0 when unavailable or non-positive. */
export function playerVelocitySubscore(playerVelocityPct: number | null): number {
  if (playerVelocityPct === null || playerVelocityPct <= 0) return 0;
  const capped = Math.min(playerVelocityPct, PLAYER_VELOCITY_CAP);
  return logistic(capped, PLAYER_VELOCITY_MIDPOINT, PLAYER_VELOCITY_STEEPNESS);
}

/** Recency sub-score in [0, 1] via exponential decay on age; 0 when age unknown. */
export function recencySubscore(ageDays: number | null): number {
  if (ageDays === null) return 0;
  const age = Math.max(ageDays, 0);
  return Math.exp(-age / RECENCY_TAU_DAYS);
}

/**
 * Reception sub-score in [0, 1]: positive fraction, linearly discounted when
 * the review count is small (a 95% on 20 reviews is weak evidence).
 */
export function receptionSubscore(
  positivePct: number | null,
  reviewTotal: number | null,
): number {
  if (positivePct === null) return 0;
  const pct = Math.min(Math.max(positivePct, 0), 1);
  const n = Math.max(reviewTotal ?? 0, 0);
  const trust = Math.min(1, n / RECEPTION_FULL_TRUST_REVIEWS);
  return pct * trust;
}

/**
 * Blend the four sub-scores into a 0-100 virality score. Returns the components
 * alongside so consumers can show/reason over the raw normalized inputs.
 */
export function computeVirality(signals: ViralitySignals): ViralityResult {
  const components: ViralityComponents = {
    reviewVelocity: reviewVelocitySubscore(signals.reviewVelocityPerDay),
    playerVelocity: playerVelocitySubscore(signals.playerVelocityPct),
    recency: recencySubscore(signals.ageDays),
    reception: receptionSubscore(signals.positivePct, signals.reviewTotal),
  };
  const blended =
    WEIGHTS.reviewVelocity * components.reviewVelocity +
    WEIGHTS.playerVelocity * components.playerVelocity +
    WEIGHTS.recency * components.recency +
    WEIGHTS.reception * components.reception;
  return { viralityScore: 100 * blended, components };
}
