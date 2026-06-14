/**
 * MCP tool: `get_game_history`.
 *
 * Time-series for a single universe, merged from two sources:
 *  - the hosted `bloxscout-data` dataset (hourly points for the last ~7
 *    days, daily rollups for the full tracked lifetime) — available for any
 *    tracked game with zero local setup;
 *  - the local `SnapshotStore` (raw points captured by `snapshot_game` /
 *    `bloxscout snapshot --cron`) — finer-grained and covers games the
 *    hosted pipeline doesn't track.
 *
 * Local points win inside an hour bucket (they're raw observations, not
 * averages). Hosted daily points only fill dates no other source covers.
 */

import { BloxscoutError } from "@bloxscout/core/errors";
import type { GameHistoryEntry } from "@bloxscout/core/hosted-format";
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "./types.js";

export const getGameHistoryInputSchema = z.object({
  universeId: z.number().int().positive().describe("Roblox universe ID to read history for."),
  since: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("Inclusive ISO 8601 lower bound on `takenAt`. Defaults to the beginning of time."),
  limit: z
    .number()
    .int()
    .positive()
    .max(10_000)
    .optional()
    .describe("Maximum rows to return, newest first. Defaults to 100."),
});

const mergedSnapshotSchema = z.object({
  universeId: z.number(),
  takenAt: z.string(),
  playing: z.number(),
  visits: z.number(),
  favoritedCount: z.number(),
  /** Present on local rows only — the hosted dataset doesn't carry votes. */
  totalUpVotes: z.number().optional(),
  totalDownVotes: z.number().optional(),
  /**
   * Where the row came from: a raw local observation, an hosted hourly
   * average, or an hosted daily rollup (stamped at 00:00 UTC).
   */
  source: z.enum(["local", "hosted-hourly", "hosted-daily"]).optional(),
});

export const getGameHistoryOutputSchema = z.object({
  universeId: z.number().int().positive(),
  snapshots: z.array(mergedSnapshotSchema),
  coverage: z
    .object({
      local: z.number().int().nonnegative(),
      hostedHourly: z.number().int().nonnegative(),
      hostedDaily: z.number().int().nonnegative(),
    })
    .optional(),
});

export type GetGameHistoryInput = z.infer<typeof getGameHistoryInputSchema>;
export type GetGameHistoryOutput = z.infer<typeof getGameHistoryOutputSchema>;
type MergedSnapshot = z.infer<typeof mergedSnapshotSchema>;

const HOUR_MS = 60 * 60 * 1000;

export async function getGameHistoryHandler(
  input: GetGameHistoryInput,
  ctx: ToolContext,
): Promise<GetGameHistoryOutput> {
  if (ctx.store === undefined && ctx.hosted === undefined) {
    throw new BloxscoutError(
      "get_game_history requires a SnapshotStore or hosted data in context.",
      "INTERNAL_ERROR",
    );
  }
  const since = input.since ? new Date(input.since) : undefined;
  const limit = input.limit ?? 100;
  const sinceMs = since?.getTime() ?? 0;

  const localRows =
    ctx.store?.getGameHistory(input.universeId, { since, limit: input.limit }) ?? [];
  const hosted: GameHistoryEntry | null =
    ctx.hosted !== undefined ? await ctx.hosted.getGameHistory(input.universeId) : null;

  const merged: MergedSnapshot[] = [];
  // Hour buckets already covered (local first — raw observations win).
  const coveredHours = new Set<number>();
  // Dates covered by anything finer than a daily rollup.
  const coveredDates = new Set<string>();

  for (const row of localRows) {
    merged.push({ ...row, source: "local" });
    const t = Date.parse(row.takenAt);
    coveredHours.add(Math.floor(t / HOUR_MS));
    coveredDates.add(row.takenAt.slice(0, 10));
  }
  let hostedHourly = 0;
  let hostedDaily = 0;
  for (const [t, avg, , visits, favorited] of hosted?.hourly ?? []) {
    if (t < sinceMs) continue;
    if (coveredHours.has(Math.floor(t / HOUR_MS))) continue;
    const takenAt = new Date(t).toISOString();
    merged.push({
      universeId: input.universeId,
      takenAt,
      playing: Math.round(avg),
      visits,
      favoritedCount: favorited,
      source: "hosted-hourly",
    });
    coveredDates.add(takenAt.slice(0, 10));
    hostedHourly += 1;
  }
  for (const [date, avg, , , favorited] of hosted?.daily ?? []) {
    const t = Date.parse(`${date}T00:00:00.000Z`);
    if (t < sinceMs) continue;
    if (coveredDates.has(date)) continue;
    merged.push({
      universeId: input.universeId,
      takenAt: new Date(t).toISOString(),
      playing: Math.round(avg),
      // Daily rows carry a visits *delta*, not a cumulative count — surface
      // 0 rather than a misleading number; agents wanting visits should use
      // hourly/local coverage.
      visits: 0,
      favoritedCount: favorited,
      source: "hosted-daily",
    });
    hostedDaily += 1;
  }

  merged.sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt));
  return {
    universeId: input.universeId,
    snapshots: merged.slice(0, limit),
    coverage: { local: localRows.length, hostedHourly, hostedDaily },
  };
}

export const getGameHistory: ToolDefinition<
  typeof getGameHistoryInputSchema,
  typeof getGameHistoryOutputSchema
> = {
  name: "get_game_history",
  description:
    "Return the snapshot history for a Roblox universe (playing / visits / favorites over time), newest first. Merges bloxscout's hosted dataset (hourly points ~7 days back + daily rollups, for ~10k+ tracked popular games, no setup needed) with the local snapshot store (raw points you captured via `snapshot_game` or `bloxscout snapshot --cron`). Each row's `source` field says where it came from; `coverage` summarizes the mix. For untracked niche games, populate local history with `snapshot_game` first.",
  inputSchema: getGameHistoryInputSchema,
  outputSchema: getGameHistoryOutputSchema,
  handler: getGameHistoryHandler,
};

/** @deprecated Legacy export retained for the get_game_history test suite. */
export const getGameHistoryTool = getGameHistory;
