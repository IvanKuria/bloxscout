/**
 * Public barrel for `@bloxscout/core`.
 *
 * Consumers can either import the whole surface from `@bloxscout/core`
 * (convenient for the web app) or cherry-pick a single module via the
 * sub-path exports map, e.g. `@bloxscout/core/roblox-client`.
 *
 * Two names collide across modules:
 *   - `EstimateGameRevenueInput` is a structural interface in `calculators`
 *     and a Zod-inferred type in `schemas`.
 *   - `TopCreatorEntry` is a structural interface in `top-creators` and a
 *     Zod-inferred type in `schemas`.
 * When two `export *` sources export the same name, TypeScript drops it from
 * the star export (ambiguous), so we re-export the canonical Zod-derived
 * versions from `schemas` explicitly below. Import the structural variants
 * from their module sub-path (`@bloxscout/core/calculators`,
 * `@bloxscout/core/top-creators`) when you need those instead.
 */

export * from "./cache.js";
export * from "./calculators.js";
export * from "./errors.js";
export * from "./genre-seeds.js";
export * from "./growth.js";
export * from "./hosted-data.js";
export * from "./hosted-format.js";
export * from "./rankings.js";
export * from "./roblox-client.js";
export * from "./scheduler.js";
export * from "./schemas.js";
export * from "./snapshots.js";
export * from "./top-creators.js";
export * from "./types.js";

// Re-assert the canonical (Zod-derived) versions of the names that collide
// across the star exports above, so `@bloxscout/core` exposes them.
export type {
  EstimateGameRevenueInput,
  TopCreatorEntry,
} from "./schemas.js";
