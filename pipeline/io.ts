/**
 * File I/O against the `bloxscout-data` working tree. Paths ending in `.gz`
 * are gzipped transparently; everything else is pretty-stable compact JSON.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

export function writeJsonFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const json = JSON.stringify(value);
  if (path.endsWith(".gz")) {
    writeFileSync(path, gzipSync(Buffer.from(json, "utf8")));
  } else {
    writeFileSync(path, `${json}\n`, "utf8");
  }
}

/** Parse a (possibly gzipped) JSON file; `null` when it doesn't exist. */
export function readJsonFile(path: string): unknown {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  const json = path.endsWith(".gz") ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
  return JSON.parse(json);
}

/** Absolute paths of all raw run files captured on `date` (UTC). */
export function listRawRunFiles(dataDir: string, date: string): string[] {
  const dir = join(dataDir, "v1", "raw", date);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json.gz"))
    .sort()
    .map((name) => join(dir, name));
}

/** Dates (YYYY-MM-DD) that currently have a raw directory. */
export function listRawDates(dataDir: string): string[] {
  const dir = join(dataDir, "v1", "raw");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
}

/** Dates that have a daily rollup file. */
export function listDailyDates(dataDir: string): string[] {
  const dir = join(dataDir, "v1", "daily");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json.gz"))
    .map((name) => name.replace(".json.gz", ""))
    .sort();
}
