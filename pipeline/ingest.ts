/**
 * Paced snapshot fetching.
 *
 * `RobloxClient.getGames` fires its 50-id chunks back-to-back, which is fine
 * for tool calls (a handful of chunks) but trips Roblox's burst rate limit
 * when the pipeline sweeps thousands of games (observed: HTTP 429 "Too many
 * requests" ~70 chunks in). This helper chunks explicitly, sleeps between
 * chunks, and tolerates individual chunk failures — the validate gate
 * decides afterwards whether enough of the run survived to publish.
 */

import type { RobloxClient } from "@bloxscout/core/roblox-client";
import type { Game } from "@bloxscout/core/types";

const DEFAULT_CHUNK_SIZE = 50;
const DEFAULT_DELAY_MS = 400;

export interface SnapshotBatchOptions {
  /** Ids per getGames call. Default 50 (Roblox's per-request cap). */
  chunkSize?: number;
  /** Pause between chunks. Default 400ms (~150 req/min, well under burst limits). */
  delayMs?: number;
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export async function snapshotInBatches(
  client: Pick<RobloxClient, "getGames">,
  ids: ReadonlyArray<number>,
  opts: SnapshotBatchOptions = {},
): Promise<Game[]> {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = opts.log ?? (() => {});

  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize) as number[]);
  }

  const games: Game[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] as number[];
    try {
      games.push(...(await client.getGames(chunk)));
    } catch (err) {
      log(`snapshot: chunk ${i + 1}/${chunks.length} failed: ${(err as Error).message}`);
    }
    if (i < chunks.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }
  return games;
}
