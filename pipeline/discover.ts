/**
 * Discovery: decide WHICH games the pipeline tracks.
 *
 * Two redundant nets, merged and deduped:
 *  - explore-api sorts ("Top Trending", "Up-and-Coming", …) across a small
 *    device/country matrix — cheap (~1 request per combo), surfaces what
 *    Roblox itself is promoting in each market.
 *  - omni-search keyword sweep over the genre seed queries — slower, runs
 *    only on scheduled runs, and is the fallback if the undocumented
 *    explore-api ever disappears.
 */

import type { ExploreSort, GetExploreSortsOptions } from "@bloxscout/core/roblox-client";
import type { GameSummary } from "@bloxscout/core/types";
import type { DiscoveredGame } from "./registry.js";

/** The slice of RobloxClient that discovery needs (narrow for testability). */
export interface DiscoveryClient {
  getExploreSorts(opts: GetExploreSortsOptions): Promise<ExploreSort[]>;
  searchGames(keyword: string, opts?: { limit?: number }): Promise<GameSummary[]>;
}

export interface ExploreMatrix {
  devices: ReadonlyArray<string>;
  countries: ReadonlyArray<string>;
}

/**
 * Default sweep: 2 devices × 4 countries = 8 explore requests, ~2-3k unique
 * games. Countries chosen for audience-size diversity (global, US, Brazil,
 * Philippines — three of Roblox's largest markets with distinct tastes).
 */
export const DEFAULT_EXPLORE_MATRIX: ExploreMatrix = {
  devices: ["computer", "high_end_phone"],
  countries: ["all", "us", "br", "ph"],
};

const OMNI_RESULTS_PER_QUERY = 25;

export interface DiscoverOptions {
  matrix?: ExploreMatrix;
  /** Run the omni-search keyword sweep in addition to explore sorts. */
  omniSweep: boolean;
  omniQueries?: ReadonlyArray<string>;
  log?: (message: string) => void;
}

/**
 * Run all discovery nets and return deduped games. Individual combo/query
 * failures are logged and skipped — discovery is best-effort by design;
 * ingest validation catches a systemically broken run later.
 */
export async function discoverGames(
  client: DiscoveryClient,
  opts: DiscoverOptions,
): Promise<DiscoveredGame[]> {
  const matrix = opts.matrix ?? DEFAULT_EXPLORE_MATRIX;
  const log = opts.log ?? (() => {});
  const byId = new Map<number, DiscoveredGame>();

  for (const device of matrix.devices) {
    for (const country of matrix.countries) {
      try {
        const sorts = await client.getExploreSorts({ device, country });
        for (const sort of sorts) {
          for (const game of sort.games) {
            if (!byId.has(game.universeId)) {
              byId.set(game.universeId, { universeId: game.universeId, name: game.name });
            }
          }
        }
      } catch (err) {
        log(`discover: explore ${device}/${country} failed: ${(err as Error).message}`);
      }
    }
  }

  if (opts.omniSweep) {
    for (const query of opts.omniQueries ?? []) {
      try {
        const results = await client.searchGames(query, { limit: OMNI_RESULTS_PER_QUERY });
        for (const summary of results) {
          if (!byId.has(summary.universeId)) {
            byId.set(summary.universeId, { universeId: summary.universeId, name: summary.name });
          }
        }
      } catch (err) {
        log(`discover: omni-search "${query}" failed: ${(err as Error).message}`);
      }
    }
  }

  return [...byId.values()];
}
