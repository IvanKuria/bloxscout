/**
 * Pure rollup functions: raw run files → hourly files → daily files →
 * per-game history shards. No I/O here — `run.ts` owns reading/writing the
 * data repo working tree so these stay trivially testable.
 */

import {
  type DailyFile,
  type DailyRow,
  type GameHistoryEntry,
  HOSTED_SCHEMA_VERSION,
  type HistoryShard,
  type HourlyFile,
  type HourlyRow,
  type RawRunFile,
  shardOf,
} from "@bloxscout/core/hosted-format";

/**
 * Aggregate one UTC day's raw run files into an hourly rollup. Runs whose
 * `takenAt` falls on a different UTC date are ignored, so callers can pass
 * a directory listing without pre-filtering edge runs.
 */
export function aggregateHourly(runs: ReadonlyArray<RawRunFile>, date: string): HourlyFile {
  interface Bucket {
    sum: number;
    count: number;
    peak: number;
    lastT: number;
    visits: number;
    favorited: number;
  }
  // game id -> hour -> bucket
  const perGame = new Map<number, Map<number, Bucket>>();

  for (const runFile of runs) {
    const t = Date.parse(runFile.takenAt);
    if (!Number.isFinite(t)) continue;
    const d = new Date(t);
    if (d.toISOString().slice(0, 10) !== date) continue;
    const hour = d.getUTCHours();
    for (const [universeId, playing, visits, favorited] of runFile.games) {
      let hours = perGame.get(universeId);
      if (hours === undefined) {
        hours = new Map();
        perGame.set(universeId, hours);
      }
      const bucket = hours.get(hour);
      if (bucket === undefined) {
        hours.set(hour, { sum: playing, count: 1, peak: playing, lastT: t, visits, favorited });
      } else {
        bucket.sum += playing;
        bucket.count += 1;
        if (playing > bucket.peak) bucket.peak = playing;
        if (t >= bucket.lastT) {
          bucket.lastT = t;
          bucket.visits = visits;
          bucket.favorited = favorited;
        }
      }
    }
  }

  const games: Record<string, HourlyRow[]> = {};
  for (const [universeId, hours] of perGame) {
    const rows: HourlyRow[] = [...hours.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, b]) => [hour, b.sum / b.count, b.peak, b.visits, b.favorited]);
    games[String(universeId)] = rows;
  }
  return { schemaVersion: HOSTED_SCHEMA_VERSION, date, games };
}

/** Compact one hourly file into a single daily row per game. */
export function aggregateDaily(hourly: HourlyFile): DailyFile {
  const games: Record<string, DailyRow> = {};
  for (const [id, rows] of Object.entries(hourly.games)) {
    if (rows.length === 0) continue;
    let sum = 0;
    let peak = 0;
    for (const [, avg, rowPeak] of rows) {
      sum += avg;
      if (rowPeak > peak) peak = rowPeak;
    }
    const first = rows[0] as HourlyRow;
    const last = rows[rows.length - 1] as HourlyRow;
    games[id] = [sum / rows.length, peak, last[3] - first[3], last[4]];
  }
  return { schemaVersion: HOSTED_SCHEMA_VERSION, date: hourly.date, games };
}

/**
 * Rebuild the per-game serving shards from hourly files (the recent window,
 * typically 7 days) and daily files (full history). Returns only shards that
 * contain at least one game.
 */
export function buildHistoryShards(
  hourlyFiles: ReadonlyArray<HourlyFile>,
  dailyFiles: ReadonlyArray<DailyFile>,
  generatedAt: string,
): Map<number, HistoryShard> {
  const entries = new Map<number, GameHistoryEntry>();

  const entryFor = (universeId: number): GameHistoryEntry => {
    let entry = entries.get(universeId);
    if (entry === undefined) {
      entry = { hourly: [], daily: [] };
      entries.set(universeId, entry);
    }
    return entry;
  };

  for (const file of hourlyFiles) {
    const dayStart = Date.parse(`${file.date}T00:00:00.000Z`);
    for (const [id, rows] of Object.entries(file.games)) {
      const entry = entryFor(Number(id));
      for (const [hour, avg, peak, visits, favorited] of rows) {
        entry.hourly.push([dayStart + hour * 60 * 60 * 1000, avg, peak, visits, favorited]);
      }
    }
  }
  for (const file of dailyFiles) {
    for (const [id, row] of Object.entries(file.games)) {
      entryFor(Number(id)).daily.push([file.date, row[0], row[1], row[2], row[3]]);
    }
  }

  const shards = new Map<number, HistoryShard>();
  for (const [universeId, entry] of entries) {
    entry.hourly.sort((a, b) => a[0] - b[0]);
    entry.daily.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const shardIndex = shardOf(universeId);
    let shard = shards.get(shardIndex);
    if (shard === undefined) {
      shard = { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt, games: {} };
      shards.set(shardIndex, shard);
    }
    shard.games[String(universeId)] = entry;
  }
  return shards;
}
