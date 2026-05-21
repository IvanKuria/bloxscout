import { BloxscoutError } from "../../shared/errors.js";

/** Validate + parse a positional `<universeId>` style argument. */
export function parseUniverseId(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new BloxscoutError(
      `universeId must be a positive integer (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}

/** Parse + dedupe a list of `<universeId...>` variadic arguments. */
export function parseUniverseIds(raw: string[]): number[] {
  if (raw.length === 0) {
    throw new BloxscoutError("at least one universeId is required", "VALIDATION_ERROR");
  }
  return raw.map(parseUniverseId);
}
