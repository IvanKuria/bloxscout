/**
 * Pipeline orchestrator. One invocation = one ingestion run:
 *
 *   discover → snapshot → rollup → views → validate
 *
 * State lives entirely in the data repo working tree passed via --data-dir;
 * the GitHub Actions workflow commits and pushes it afterwards. Exits
 * non-zero (without touching meta.json) when validation fails so the
 * workflow can abort instead of publishing a broken run.
 *
 * Usage:
 *   tsx pipeline/run.ts --data-dir ../bloxscout-data [--max-games N]
 *                       [--skip-discovery] [--omni-sweep]
 */

import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { RobloxClient } from "../src/core/roblox-client.js";
import type { Game } from "../src/core/types.js";
import {
  type DailyFile,
  HOSTED_PATHS,
  HOSTED_SCHEMA_VERSION,
  type HourlyFile,
  type MetaFile,
  type RawRunFile,
  type RegistryFile,
  RegistryFileSchema,
} from "../src/shared/hosted-format.js";
import { discoverGames } from "./discover.js";
import { snapshotInBatches } from "./ingest.js";
import {
  listDailyDates,
  listRawDates,
  listRawRunFiles,
  readJsonFile,
  writeJsonFile,
} from "./io.js";
import { DISCOVERY_QUERIES } from "./queries.js";
import {
  applyIngestResults,
  emptyRegistry,
  idsToSnapshot,
  markDormant,
  upsertDiscovered,
} from "./registry.js";
import { aggregateDaily, aggregateHourly, buildHistoryShards } from "./rollup.js";
import { validateRunOutputs } from "./validate.js";
import { computeViews } from "./views.js";

const MAX_TRACKED = 15_000;
const RAW_RETENTION_DAYS = 2;
const HOURLY_RETENTION_DAYS = 30;
const SHARD_HOURLY_WINDOW_DAYS = 7;
const VIEW_WINDOW_DAYS = 8;
/** Omni-search sweeps run on runs that start in these UTC hours (4×/day). */
const OMNI_SWEEP_HOURS = new Set([0, 6, 12, 18]);

const PACKAGE_VERSION = process.env.npm_package_version ?? "0.2.0";
const INGEST_USER_AGENT = `bloxscout-ingest/${PACKAGE_VERSION} (+https://github.com/IvanKuria/bloxscout)`;

function log(message: string): void {
  console.log(`[ingest] ${message}`);
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function readHourlyFiles(dataDir: string, dates: string[]): HourlyFile[] {
  const files: HourlyFile[] = [];
  for (const date of dates) {
    const parsed = readJsonFile(join(dataDir, HOSTED_PATHS.hourly(date)));
    if (parsed !== null) files.push(parsed as HourlyFile);
  }
  return files;
}

function lastNDates(now: Date, n: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    dates.push(dateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return dates.reverse();
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "data-dir": { type: "string" },
      "max-games": { type: "string" },
      "skip-discovery": { type: "boolean", default: false },
      "omni-sweep": { type: "boolean", default: false },
    },
  });
  const dataDir = values["data-dir"];
  if (!dataDir) {
    console.error("usage: tsx pipeline/run.ts --data-dir <bloxscout-data checkout>");
    process.exit(1);
  }
  const maxGames = values["max-games"] ? Number(values["max-games"]) : MAX_TRACKED;

  const now = new Date();
  const nowIso = now.toISOString();
  const today = dateKey(now);
  const runId = `${nowIso.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const client = new RobloxClient({ userAgent: INGEST_USER_AGENT, maxRetries: 5 });

  // -------------------------------------------------------------------------
  // Load registry
  // -------------------------------------------------------------------------
  const registryRaw = readJsonFile(join(dataDir, HOSTED_PATHS.registry));
  const registryParsed = registryRaw === null ? null : RegistryFileSchema.safeParse(registryRaw);
  const registry: RegistryFile =
    registryParsed?.success === true ? registryParsed.data : emptyRegistry(nowIso);
  if (registryRaw !== null && registryParsed?.success !== true) {
    console.error("[ingest] registry.json is corrupt — refusing to start from scratch silently");
    process.exit(1);
  }
  const knownBefore = Object.keys(registry.games).length;

  // -------------------------------------------------------------------------
  // Discover
  // -------------------------------------------------------------------------
  if (!values["skip-discovery"]) {
    const bootstrap = knownBefore === 0;
    const omniSweep = values["omni-sweep"] || bootstrap || OMNI_SWEEP_HOURS.has(now.getUTCHours());
    const discovered = await discoverGames(client, {
      omniSweep,
      omniQueries: DISCOVERY_QUERIES,
      log,
    });
    upsertDiscovered(registry, discovered, nowIso);
    log(
      `discovery: ${discovered.length} games surfaced (omniSweep=${omniSweep}), registry ${knownBefore} -> ${Object.keys(registry.games).length}`,
    );
  }

  // -------------------------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------------------------
  const isFirstRunOfDay = listRawRunFiles(dataDir, today).length === 0;
  let ids = idsToSnapshot(registry, isFirstRunOfDay);
  if (ids.length > maxGames) {
    // Over budget: keep the most recently discovered games.
    ids = ids
      .sort((a, b) => {
        const ea = registry.games[String(a)];
        const eb = registry.games[String(b)];
        return (
          (eb ? Date.parse(eb.lastDiscoveredAt) : 0) - (ea ? Date.parse(ea.lastDiscoveredAt) : 0)
        );
      })
      .slice(0, maxGames);
    log(`tracking capped at ${maxGames} games (registry has more)`);
  }

  log(`snapshotting ${ids.length} games (${Math.ceil(ids.length / 50)} paced batched requests)…`);
  const games: Game[] = await snapshotInBatches(client, ids, { log });
  const run: RawRunFile = {
    schemaVersion: HOSTED_SCHEMA_VERSION,
    runId,
    takenAt: nowIso,
    games: games.map((g) => [g.id, g.playing ?? 0, g.visits ?? 0, g.favoritedCount ?? 0]),
  };
  applyIngestResults(
    registry,
    games.map((g) => ({ id: g.id, name: g.name ?? null, genre: g.genre_l1 ?? g.genre ?? null })),
    nowIso,
  );
  writeJsonFile(join(dataDir, HOSTED_PATHS.raw(today, runId)), run);
  log(`snapshot: ${games.length}/${ids.length} games captured`);

  // -------------------------------------------------------------------------
  // Rollups
  // -------------------------------------------------------------------------
  const todayRuns = listRawRunFiles(dataDir, today).map((f) => readJsonFile(f) as RawRunFile);
  const hourlyToday = aggregateHourly(todayRuns, today);
  writeJsonFile(join(dataDir, HOSTED_PATHS.hourly(today)), hourlyToday);

  if (isFirstRunOfDay) {
    const yesterday = dateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const yesterdayDailyPath = join(dataDir, HOSTED_PATHS.daily(yesterday));
    const yesterdayHourly = readJsonFile(join(dataDir, HOSTED_PATHS.hourly(yesterday)));
    if (!existsSync(yesterdayDailyPath) && yesterdayHourly !== null) {
      writeJsonFile(yesterdayDailyPath, aggregateDaily(yesterdayHourly as HourlyFile));
      log(`daily rollup written for ${yesterday}`);
    }

    // Prune raw beyond retention.
    for (const date of listRawDates(dataDir)) {
      const ageDays = (now.getTime() - Date.parse(`${date}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
      if (ageDays > RAW_RETENTION_DAYS) {
        rmSync(join(dataDir, "v1", "raw", date), { recursive: true, force: true });
        log(`pruned raw/${date}`);
      }
    }
    // Prune hourly beyond retention.
    for (const date of lastNDates(now, 90)) {
      const ageDays = (now.getTime() - Date.parse(`${date}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
      const path = join(dataDir, HOSTED_PATHS.hourly(date));
      if (ageDays > HOURLY_RETENTION_DAYS && existsSync(path)) {
        rmSync(path, { force: true });
        log(`pruned hourly/${date}`);
      }
    }

    // Rebuild history shards: recent hourly window + full daily history.
    const shardHourly = readHourlyFiles(dataDir, lastNDates(now, SHARD_HOURLY_WINDOW_DAYS));
    const dailyFiles = listDailyDates(dataDir)
      .map((date) => readJsonFile(join(dataDir, HOSTED_PATHS.daily(date))) as DailyFile | null)
      .filter((f): f is DailyFile => f !== null);
    const shards = buildHistoryShards(shardHourly, dailyFiles, nowIso);
    for (const [index, shard] of shards) {
      writeJsonFile(join(dataDir, HOSTED_PATHS.historyShard(index)), shard);
    }
    log(`rebuilt ${shards.size} history shards`);

    // Demote dead games using 7d daily peaks (+ today's hourly peaks).
    const peaks = new Map<number, number>();
    for (const file of dailyFiles.slice(-7)) {
      for (const [id, row] of Object.entries(file.games)) {
        const universeId = Number(id);
        peaks.set(universeId, Math.max(peaks.get(universeId) ?? 0, row[1]));
      }
    }
    for (const [id, rows] of Object.entries(hourlyToday.games)) {
      const universeId = Number(id);
      for (const row of rows) {
        peaks.set(universeId, Math.max(peaks.get(universeId) ?? 0, row[2]));
      }
    }
    const demoted = markDormant(registry, (id) => peaks.get(id) ?? null, nowIso);
    if (demoted.length > 0) log(`demoted ${demoted.length} games to dormant`);
  }

  // -------------------------------------------------------------------------
  // Views
  // -------------------------------------------------------------------------
  const viewHourly = readHourlyFiles(dataDir, lastNDates(now, VIEW_WINDOW_DAYS));
  const views = computeViews({ registry, hourlyFiles: viewHourly, run, now: now.getTime() });
  writeJsonFile(join(dataDir, HOSTED_PATHS.trendingView), views.trending);
  writeJsonFile(join(dataDir, HOSTED_PATHS.upAndComingView), views.upAndComing);
  writeJsonFile(join(dataDir, HOSTED_PATHS.breakoutsView), views.breakouts);
  writeJsonFile(join(dataDir, HOSTED_PATHS.genresView), views.genres);
  registry.generatedAt = nowIso;
  writeJsonFile(join(dataDir, HOSTED_PATHS.registry), registry);
  log(
    `views: trending=${views.trending.entries.length} upAndComing=${views.upAndComing.entries.length} breakouts=${views.breakouts.entries.length} genres=${views.genres.genres.length}`,
  );

  // -------------------------------------------------------------------------
  // Validate, then publish meta
  // -------------------------------------------------------------------------
  const errors = validateRunOutputs({ run, requestedCount: ids.length, views });
  if (errors.length > 0) {
    for (const error of errors) console.error(`[ingest] VALIDATION FAILED: ${error}`);
    process.exit(1);
  }
  const meta: MetaFile = {
    schemaVersion: HOSTED_SCHEMA_VERSION,
    generatedAt: nowIso,
    gamesTracked: Object.keys(registry.games).length,
    latestRunId: runId,
  };
  writeJsonFile(join(dataDir, HOSTED_PATHS.meta), meta);
  log(`run ${runId} complete — ${meta.gamesTracked} games tracked`);
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});
