import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listRawRunFiles, readJsonFile, writeJsonFile } from "../../pipeline/io.js";

describe("pipeline io", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bloxscout-io-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips plain JSON, creating parent directories", () => {
    const path = join(dir, "v1", "views", "trending.json");
    writeJsonFile(path, { hello: ["world"] });
    expect(readJsonFile(path)).toEqual({ hello: ["world"] });
  });

  it("round-trips gzipped JSON for .gz paths", () => {
    const path = join(dir, "v1", "hourly", "2026-06-12.json.gz");
    writeJsonFile(path, { games: { "42": [[10, 1, 1, 0, 0]] } });
    expect(readJsonFile(path)).toEqual({ games: { "42": [[10, 1, 1, 0, 0]] } });
  });

  it("returns null for missing files", () => {
    expect(readJsonFile(join(dir, "nope.json"))).toBeNull();
  });

  it("lists raw run files for a date", () => {
    writeJsonFile(join(dir, "v1", "raw", "2026-06-12", "run-a.json.gz"), { runId: "a" });
    writeJsonFile(join(dir, "v1", "raw", "2026-06-12", "run-b.json.gz"), { runId: "b" });
    writeJsonFile(join(dir, "v1", "raw", "2026-06-11", "run-z.json.gz"), { runId: "z" });
    const files = listRawRunFiles(dir, "2026-06-12");
    expect(files.map((f) => (readJsonFile(f) as { runId: string }).runId).sort()).toEqual([
      "a",
      "b",
    ]);
    expect(listRawRunFiles(dir, "2026-06-10")).toEqual([]);
  });
});
