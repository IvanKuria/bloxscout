/**
 * Optional, rate-limit-safe gamepass/monetization sampling.
 *
 * The main snapshot sweep already fires ~thousands of `getGames` requests per
 * 30-min run; gamepass listing is a SEPARATE request per universe and would
 * blow the request budget if run across the whole registry. So this sampler
 * is:
 *   - flag-gated (off by default — `run.ts --sample-gamepasses`),
 *   - scoped to the top-N games by live CCU (default 200), and
 *   - paced (400ms between calls, matching the snapshot pacing).
 *
 * Request budget: at most N extra requests per run where N is the configured
 * top-N (default 200 → +200 requests, ~80s at 400ms pacing). Pricing changes
 * rarely, so the SLOW cache on `getGamePasses` further dedupes across runs.
 * The endpoint's unauthenticated reachability is not guaranteed (Roblox moved
 * it to apis.roblox.com in 2025), which is the other reason it ships gated.
 */

import type { RawRunFile } from "@bloxscout/core/hosted-format";
import type { RobloxClient } from "@bloxscout/core/roblox-client";
import type { GamePass } from "@bloxscout/core/types";

const DEFAULT_DELAY_MS = 400;

/** Default ceiling on gamepass fetches per run when sampling is enabled. */
export const DEFAULT_GAMEPASS_TOP_N = 200;

/** Top-N universe ids by live `playing` from the current run, descending. */
export function selectGamePassSampleIds(run: RawRunFile, topN: number): number[] {
  if (topN <= 0) return [];
  return run.games
    .map((row) => [row[0], row[1]] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id);
}

export interface SampleGamePassesOptions {
  /** Pause between per-universe fetches. Default 400ms. */
  delayMs?: number;
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

/**
 * Fetch gamepasses for each universe id sequentially with pacing. Individual
 * failures are logged and skipped (best-effort, like discovery/snapshot).
 * Returns a `{ universeId: GamePass[] }` map of the ids that succeeded.
 */
export async function sampleGamePasses(
  client: Pick<RobloxClient, "getGamePasses">,
  ids: ReadonlyArray<number>,
  opts: SampleGamePassesOptions = {},
): Promise<Record<number, GamePass[]>> {
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = opts.log ?? (() => {});

  const out: Record<number, GamePass[]> = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i] as number;
    try {
      out[id] = await client.getGamePasses(id);
    } catch (err) {
      log(`gamepasses: universe ${id} failed: ${(err as Error).message}`);
    }
    if (i < ids.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }
  return out;
}
