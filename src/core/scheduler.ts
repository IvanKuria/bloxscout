/**
 * In-process snapshot scheduler.
 *
 * Backs `bloxscout snapshot --cron` (Phase 3) and the MCP `watch_games` flow.
 * Deliberately uses `setInterval` instead of pulling in a cron library — the
 * cadence we care about is "every N seconds", not crontab expressions.
 *
 * The scheduler does NOT keep the process alive on its own; callers should
 * own the process lifetime (e.g. by awaiting a never-resolving promise in
 * the CLI).
 */

import type { RobloxClient } from "./roblox-client.js";
import type { SnapshotStore } from "./snapshots.js";
import type { Game, RobloxUniverseId } from "./types.js";

/** Result handed to the optional `onTick` callback after each successful tick. */
export interface SchedulerTickResult {
  takenAt: string;
  recorded: number;
  games: Game[];
}

export interface SnapshotSchedulerOptions {
  client: RobloxClient;
  store: SnapshotStore;
  /**
   * Optional sink for tick logs. Defaults to `console.error` so stdout stays
   * clean for MCP / pipeable CLI output.
   */
  logger?: (line: string) => void;
}

/**
 * Periodically polls `client.getGames(universeIds)` and writes the result to
 * `store`. Errors during a tick are caught and logged so a transient Roblox
 * outage doesn't tear down the scheduler.
 */
export class SnapshotScheduler {
  private readonly client: RobloxClient;
  private readonly store: SnapshotStore;
  private readonly log: (line: string) => void;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: SnapshotSchedulerOptions) {
    this.client = options.client;
    this.store = options.store;
    this.log = options.logger ?? ((line) => process.stderr.write(`${line}\n`));
  }

  /**
   * Begin polling. The first tick fires immediately so callers see data
   * without waiting for the first interval to elapse. Subsequent ticks run
   * every `intervalSeconds`.
   *
   * Calling `start` while already running is a no-op (a warning is logged).
   */
  start(
    universeIds: RobloxUniverseId[],
    intervalSeconds: number,
    onTick?: (result: SchedulerTickResult) => void,
  ): void {
    if (this.timer !== null) {
      this.log("scheduler: start() called while already running, ignoring");
      return;
    }
    if (universeIds.length === 0) {
      throw new Error("SnapshotScheduler.start: universeIds must be non-empty");
    }
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      throw new Error("SnapshotScheduler.start: intervalSeconds must be a positive number");
    }

    const tick = async (): Promise<void> => {
      try {
        const games = await this.client.getGames(universeIds);
        const { takenAt, recorded } = this.store.recordSnapshot(games);
        this.log(`scheduler: recorded ${recorded} game(s) at ${takenAt}`);
        onTick?.({ takenAt, recorded, games });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log(`scheduler: tick failed: ${message}`);
      }
    };

    // Fire-and-forget the first tick — we deliberately don't await it so the
    // caller gets control back immediately.
    void tick();
    this.timer = setInterval(() => {
      void tick();
    }, intervalSeconds * 1000);
    // Allow the process to exit if nothing else is keeping it alive (tests).
    if (typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  /** Stop polling. Safe to call when not running. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** True iff `start` has been called and `stop` has not. */
  get running(): boolean {
    return this.timer !== null;
  }
}
