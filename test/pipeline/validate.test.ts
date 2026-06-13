import { describe, expect, it } from "vitest";
import { validateRunOutputs } from "../../pipeline/validate.js";
import type { RawRunFile } from "../../src/shared/hosted-format.js";
import { HOSTED_SCHEMA_VERSION } from "../../src/shared/hosted-format.js";

const NOW_ISO = "2026-06-12T12:00:00.000Z";

function run(gameCount: number): RawRunFile {
  return {
    schemaVersion: HOSTED_SCHEMA_VERSION,
    runId: "r1",
    takenAt: NOW_ISO,
    games: Array.from({ length: gameCount }, (_, i) => [i + 1, 10, 100, 5]),
  };
}

const emptyView = { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt: NOW_ISO, entries: [] };
const views = {
  trending: emptyView,
  upAndComing: emptyView,
  breakouts: emptyView,
  genres: { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt: NOW_ISO, genres: [] },
};

describe("validateRunOutputs", () => {
  it("passes a healthy run", () => {
    expect(validateRunOutputs({ run: run(500), requestedCount: 600, views })).toEqual([]);
  });

  it("fails when the fetch success rate collapses", () => {
    const errors = validateRunOutputs({ run: run(100), requestedCount: 1000, views });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/10%/);
  });

  it("fails an empty run even when nothing was requested (misconfigured registry)", () => {
    const errors = validateRunOutputs({ run: run(0), requestedCount: 0, views });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails when a view does not conform to its schema", () => {
    const badViews = {
      ...views,
      trending: { ...emptyView, entries: [{ universeId: "not-a-number" }] } as never,
    };
    const errors = validateRunOutputs({ run: run(500), requestedCount: 600, views: badViews });
    expect(errors.some((e) => e.includes("trending"))).toBe(true);
  });
});
