import {
  GamePassFileSchema,
  RawRunFileSchema,
  RawRunRowSchema,
  RegistryEntrySchema,
} from "@bloxscout/core/hosted-format";
import { describe, expect, it } from "vitest";

describe("RawRunRowSchema (additive created/updated columns)", () => {
  it("still accepts the original 4-column row", () => {
    expect(RawRunRowSchema.safeParse([1, 100, 1000, 5]).success).toBe(true);
  });

  it("accepts trailing createdMs/updatedMs columns", () => {
    const parsed = RawRunRowSchema.safeParse([1, 100, 1000, 5, 1577836800000, 1717200000000]);
    expect(parsed.success).toBe(true);
  });

  it("rejects a row shorter than 4 columns", () => {
    expect(RawRunRowSchema.safeParse([1, 100, 1000]).success).toBe(false);
  });

  it("parses a mixed-width run file (old + new rows)", () => {
    const file = {
      schemaVersion: 1,
      runId: "r1",
      takenAt: "2026-06-13T00:00:00.000Z",
      games: [
        [1, 100, 1000, 5],
        [2, 50, 500, 1, 1577836800000, 1717200000000],
      ],
    };
    expect(RawRunFileSchema.safeParse(file).success).toBe(true);
  });
});

describe("RegistryEntrySchema (optional cadence fields)", () => {
  const base = {
    name: "G",
    genre: null,
    addedAt: "2026-06-13T00:00:00.000Z",
    lastSeenAt: "2026-06-13T00:00:00.000Z",
    lastDiscoveredAt: "2026-06-13T00:00:00.000Z",
    tier: "active" as const,
  };

  it("accepts a pre-v0.3 entry without cadence fields", () => {
    expect(RegistryEntrySchema.safeParse(base).success).toBe(true);
  });

  it("accepts an entry with createdAt/lastUpdatedAt/updateCount", () => {
    const parsed = RegistryEntrySchema.safeParse({
      ...base,
      createdAt: "2020-01-01T00:00:00.000Z",
      lastUpdatedAt: "2026-06-01T00:00:00.000Z",
      updateCount: 3,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("GamePassFileSchema", () => {
  it("accepts a file with priced, free, and empty pass lists", () => {
    const file = {
      schemaVersion: 1,
      date: "2026-06-13",
      sampledAt: "2026-06-13T00:00:00.000Z",
      games: {
        "42": [
          [100, "VIP", 199],
          [101, "Free Perk", null],
        ],
        "7": [],
      },
    };
    expect(GamePassFileSchema.safeParse(file).success).toBe(true);
  });

  it("rejects a non-numeric price", () => {
    const file = {
      schemaVersion: 1,
      date: "2026-06-13",
      sampledAt: "2026-06-13T00:00:00.000Z",
      games: { "42": [[100, "VIP", "free"]] },
    };
    expect(GamePassFileSchema.safeParse(file).success).toBe(false);
  });
});
