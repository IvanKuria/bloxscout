/**
 * Registry mutations: which games the pipeline tracks, and at what tier.
 *
 * The registry is the pipeline's only piece of cross-run state besides the
 * rollup files themselves. Discovery sweeps add/refresh entries; ingest
 * stamps what it actually fetched; `markDormant` demotes games that neither
 * discovery nor players care about anymore so the snapshot budget stays
 * spent on live games.
 */

import {
  HOSTED_SCHEMA_VERSION,
  type RegistryEntry,
  type RegistryFile,
} from "@bloxscout/core/hosted-format";

const DORMANT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const DORMANT_PEAK_CCU = 5;

export interface DiscoveredGame {
  universeId: number;
  name: string | null;
}

export interface IngestedGame {
  id: number;
  name: string | null;
  genre: string | null;
  /** Game's own `created` ISO timestamp (games.roblox.com). */
  created?: string | null;
  /** Game's own `updated` ISO timestamp (games.roblox.com). */
  updated?: string | null;
}

export function emptyRegistry(generatedAt: string): RegistryFile {
  return { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt, games: {} };
}

/**
 * Add newly discovered games and refresh `lastDiscoveredAt` (+ name) on known
 * ones. Rediscovery always promotes back to the active tier.
 */
export function upsertDiscovered(
  registry: RegistryFile,
  discovered: ReadonlyArray<DiscoveredGame>,
  nowIso: string,
): void {
  for (const game of discovered) {
    const key = String(game.universeId);
    const existing = registry.games[key];
    if (existing === undefined) {
      registry.games[key] = {
        name: game.name,
        genre: null,
        addedAt: nowIso,
        lastSeenAt: nowIso,
        lastDiscoveredAt: nowIso,
        tier: "active",
      };
    } else {
      existing.name = game.name ?? existing.name;
      existing.lastDiscoveredAt = nowIso;
      existing.tier = "active";
    }
  }
}

/**
 * Stamp name/genre/lastSeenAt from a successful ingest fetch, and track game
 * age + update cadence for the breakout-teardown copilot:
 *  - `createdAt` is recorded once (stable; the game's own birth date).
 *  - `lastUpdatedAt` follows the game's latest `updated` timestamp.
 *  - `updateCount` increments each run we observe a *newer* `updated` than
 *    the one already stored — a proxy for developer shipping cadence.
 */
export function applyIngestResults(
  registry: RegistryFile,
  games: ReadonlyArray<IngestedGame>,
  nowIso: string,
): void {
  for (const game of games) {
    const entry = registry.games[String(game.id)];
    if (entry === undefined) continue;
    entry.name = game.name ?? entry.name;
    entry.genre = game.genre ?? entry.genre;
    entry.lastSeenAt = nowIso;

    if (game.created != null && entry.createdAt === undefined) {
      entry.createdAt = game.created;
    }
    if (game.updated != null) {
      if (entry.lastUpdatedAt === undefined) {
        // First sighting: seed without counting it as a fresh ship.
        entry.lastUpdatedAt = game.updated;
        entry.updateCount = 0;
      } else if (Date.parse(game.updated) > Date.parse(entry.lastUpdatedAt)) {
        entry.lastUpdatedAt = game.updated;
        entry.updateCount = (entry.updateCount ?? 0) + 1;
      }
    }
  }
}

/**
 * Demote to dormant every active game that discovery has not surfaced for 7
 * days AND whose 7-day peak CCU is below 5 (a `null` peak — no history yet —
 * counts as low). Returns the demoted universe ids.
 */
export function markDormant(
  registry: RegistryFile,
  peak7d: (universeId: number) => number | null,
  nowIso: string,
): number[] {
  const cutoff = Date.parse(nowIso) - DORMANT_AFTER_MS;
  const demoted: number[] = [];
  for (const [key, entry] of Object.entries(registry.games)) {
    if (entry.tier !== "active") continue;
    if (Date.parse(entry.lastDiscoveredAt) > cutoff) continue;
    const universeId = Number(key);
    const peak = peak7d(universeId);
    if (peak !== null && peak >= DORMANT_PEAK_CCU) continue;
    entry.tier = "dormant";
    demoted.push(universeId);
  }
  return demoted;
}

/** Ids to snapshot this run: active always; dormant only when `includeDormant`. */
export function idsToSnapshot(registry: RegistryFile, includeDormant: boolean): number[] {
  const ids: number[] = [];
  for (const [key, entry] of Object.entries(registry.games)) {
    if (entry.tier === "active" || includeDormant) ids.push(Number(key));
  }
  return ids;
}

export type { RegistryEntry };
