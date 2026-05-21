import { randomUUID } from "node:crypto";
import { z } from "zod";
import { SnapshotScheduler } from "../../core/scheduler.js";
import { SnapshotStore } from "../../core/snapshots.js";
import { BloxscoutError } from "../../shared/errors.js";
import type { ToolDefinition } from "./types.js";

/**
 * In-memory registry of live watches, keyed by watch ID. Module-level so it
 * survives across `watch_games` calls within a single MCP server process —
 * but no longer. When the process exits, every watch dies; agents must NOT
 * rely on a watch ID surviving an MCP server restart.
 */
interface ActiveWatch {
  watchId: string;
  universeIds: number[];
  intervalSeconds: number;
  startedAt: string;
  scheduler: SnapshotScheduler;
  snapshotsRecorded: number;
  lastTickAt: string | null;
}

const ACTIVE_WATCHES = new Map<string, ActiveWatch>();

/** Test-only: drop every active watch. Not exported from the package surface. */
export function _resetWatchesForTests(): void {
  for (const w of ACTIVE_WATCHES.values()) {
    w.scheduler.stop();
  }
  ACTIVE_WATCHES.clear();
}

/**
 * Input schema. We refine to require `watchId` for `stop` / `status` actions
 * and `universeIds` for `start`, since they are mutually exclusive concerns.
 */
export const WatchGamesInputSchema = z
  .object({
    action: z.enum(["start", "stop", "status"]).default("start"),
    universeIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
    intervalSeconds: z.number().int().min(60).max(3600).default(300),
    watchId: z.string().uuid().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.action === "start") {
      if (val.universeIds === undefined || val.universeIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "action 'start' requires non-empty `universeIds`",
          path: ["universeIds"],
        });
      }
    } else {
      if (val.watchId === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `action '${val.action}' requires \`watchId\``,
          path: ["watchId"],
        });
      }
    }
  });

export const WatchGamesOutputSchema = z.object({
  watchId: z.string(),
  status: z.enum(["running", "stopped"]),
  universeIds: z.array(z.number().int().positive()).optional(),
  intervalSeconds: z.number().int().positive().optional(),
  startedAt: z.string().optional(),
  snapshotsRecorded: z.number().int().nonnegative().optional(),
  lastTickAt: z.string().nullable().optional(),
  nextTickAt: z.string().nullable().optional(),
  finalSnapshotCount: z.number().int().nonnegative().optional(),
});

export const watchGames: ToolDefinition<
  typeof WatchGamesInputSchema,
  typeof WatchGamesOutputSchema
> = {
  name: "watch_games",
  description: [
    "Manage in-process background watches that periodically snapshot one or",
    "more Roblox games into Bloxscout's local SQLite store. Three actions:",
    "`start` (default) spawns a new watch and returns a `watchId`; `stop`",
    "halts a watch (requires `watchId`); `status` reports tick counts and",
    "next-tick ETA for an existing watch.",
    "",
    "Inputs: `action` (default 'start'); `universeIds` (required for",
    "'start', 1-100 ids); `intervalSeconds` (60-3600, default 300);",
    "`watchId` (required for 'stop' / 'status').",
    "",
    "IMPORTANT lifetime: watches live only as long as the MCP server",
    "process. They are stored in memory keyed by `watchId` and DO NOT",
    "survive an MCP server restart. Do not hand a `watchId` to a future",
    "session and expect it to still exist. For durable scheduled snapshots",
    "use the `bloxscout snapshot --cron` CLI flow.",
    "",
    "The call returns immediately — the scheduler runs in the background",
    "and writes snapshots to `~/.bloxscout/data.db` (or `BLOXSCOUT_DATA_DIR`).",
  ].join(" "),
  inputSchema: WatchGamesInputSchema,
  outputSchema: WatchGamesOutputSchema,
  handler: async (input, ctx) => {
    if (input.action === "start") {
      // Build a SnapshotStore on demand if the ctx didn't ship one. This keeps
      // the tool usable from the default MCP server, which doesn't yet inject
      // a store. Each watch shares the default DB unless callers wire their own.
      const store = ctx.store ?? new SnapshotStore();
      const universeIds = input.universeIds as number[];
      const watchId = randomUUID();
      const scheduler = new SnapshotScheduler({ client: ctx.client, store });
      const startedAt = new Date().toISOString();
      const watch: ActiveWatch = {
        watchId,
        universeIds,
        intervalSeconds: input.intervalSeconds,
        startedAt,
        scheduler,
        snapshotsRecorded: 0,
        lastTickAt: null,
      };
      scheduler.start(universeIds, input.intervalSeconds, (tick) => {
        watch.snapshotsRecorded += tick.recorded;
        watch.lastTickAt = tick.takenAt;
      });
      ACTIVE_WATCHES.set(watchId, watch);
      return {
        watchId,
        status: "running" as const,
        universeIds,
        intervalSeconds: input.intervalSeconds,
        startedAt,
        snapshotsRecorded: 0,
        lastTickAt: null,
      };
    }

    const watchId = input.watchId as string;
    const watch = ACTIVE_WATCHES.get(watchId);
    if (watch === undefined) {
      throw new BloxscoutError(
        `watch_games: no active watch with id "${watchId}"`,
        "VALIDATION_ERROR",
      );
    }

    if (input.action === "stop") {
      watch.scheduler.stop();
      ACTIVE_WATCHES.delete(watchId);
      return {
        watchId,
        status: "stopped" as const,
        finalSnapshotCount: watch.snapshotsRecorded,
      };
    }

    // status
    const nextTickAt =
      watch.lastTickAt === null
        ? null
        : new Date(
            new Date(watch.lastTickAt).getTime() + watch.intervalSeconds * 1000,
          ).toISOString();
    return {
      watchId,
      status: "running" as const,
      universeIds: watch.universeIds,
      intervalSeconds: watch.intervalSeconds,
      startedAt: watch.startedAt,
      snapshotsRecorded: watch.snapshotsRecorded,
      lastTickAt: watch.lastTickAt,
      nextTickAt,
    };
  },
};
