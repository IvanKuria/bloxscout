import { BloxscoutError, RobloxApiError, mapToMcpError } from "../shared/errors.js";

/**
 * Exit code policy:
 * - 0 success
 * - 1 user error (bad input → VALIDATION_ERROR)
 * - 2 Roblox API error (ROBLOX_*)
 * - 3 internal / unknown
 *
 * Stable so shell scripts and CI can branch on `$?`.
 */
export function exitCodeFor(err: unknown): number {
  if (err instanceof BloxscoutError) {
    switch (err.code) {
      case "VALIDATION_ERROR":
        return 1;
      case "ROBLOX_API_ERROR":
      case "ROBLOX_NOT_FOUND":
      case "ROBLOX_RATE_LIMITED":
      case "ROBLOX_BAD_REQUEST":
        return 2;
      case "NOT_IMPLEMENTED":
      case "INTERNAL_ERROR":
        return 3;
    }
  }
  if (err instanceof RobloxApiError) return 2;
  return 3;
}

/** Build the structured payload printed by `printError` / emitted as JSON. */
export function toErrorPayload(err: unknown) {
  return mapToMcpError(err);
}
