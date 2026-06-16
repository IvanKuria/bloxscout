import type {
  ExternalCandidate,
  ExternalGameObservation,
  ExternalSource,
} from "@bloxscout/core/external-sources";
import type { SteamCatalogFile, SteamStateFile } from "@bloxscout/core/hosted-format";
import {
  computeAgeDays,
  computeSteamBreakouts,
  slugify,
} from "../../pipeline/steam-breakouts.js";
import { describe, expect, it } from "vitest";

const NOW = Date.parse("2026-06-16T00:00:00.000Z");
const DAY = 86_400_000;

function obs(over: Partial<ExternalGameObservation> & { externalId: number; name: string }): ExternalGameObservation {
  return {
    source: "steam",
    storeUrl: `https://store.steampowered.com/app/${over.externalId}`,
    headerImageUrl: null,
    shortDescription: null,
    releaseDate: "2026-06-10T00:00:00.000Z",
    genres: [],
    tags: [],
    priceUsd: null,
    reviewTotal: null,
    positivePct: null,
    reviewScoreDesc: null,
    currentPlayers: null,
    ownersLow: null,
    ownersHigh: null,
    ...over,
  };
}

function fakeSource(observations: ExternalGameObservation[]): ExternalSource {
  const byId = new Map(observations.map((o) => [o.externalId, o]));
  const candidates: ExternalCandidate[] = observations.map((o) => ({
    externalId: o.externalId,
    name: o.name,
  }));
  return {
    id: "steam",
    listCandidates: async () => candidates,
    enrich: async (id) => byId.get(id) ?? null,
  };
}

describe("computeSteamBreakouts", () => {
  it("first run uses launch-to-date velocity flagged first-seen", async () => {
    const r = await computeSteamBreakouts({
      source: fakeSource([
        obs({ externalId: 4704690, name: "MECCHA CHAMELEON", reviewTotal: 40000, positivePct: 0.95 }),
      ]),
      priorState: null,
      priorCatalog: null,
      now: NOW,
    });
    const e = r.view.entries[0];
    expect(e?.observationBasis).toBe("first-seen");
    // 40000 reviews / 6 days age ≈ 6666/day
    expect(e?.reviewVelocityPerDay).toBeGreaterThan(6000);
    expect(e?.viralityScore).toBeGreaterThan(0);
  });

  it("second run computes two-snapshot review velocity from prior state", async () => {
    const priorState: SteamStateFile = {
      schemaVersion: 1,
      generatedAt: new Date(NOW - DAY).toISOString(),
      apps: {
        "4704690": {
          name: "MECCHA CHAMELEON",
          firstSeenAt: new Date(NOW - DAY).toISOString(),
          lastReviewTotal: 20000,
          lastReviewAt: new Date(NOW - DAY).toISOString(),
          lastPlayers: 10000,
          lastPlayersAt: new Date(NOW - DAY).toISOString(),
          releaseDate: "2026-06-10T00:00:00.000Z",
          genres: [],
          tags: [],
        },
      },
    };
    const r = await computeSteamBreakouts({
      source: fakeSource([
        obs({ externalId: 4704690, name: "MECCHA CHAMELEON", reviewTotal: 40000, currentPlayers: 25000 }),
      ]),
      priorState,
      priorCatalog: null,
      now: NOW,
    });
    const e = r.view.entries[0];
    expect(e?.observationBasis).toBe("two-snapshot");
    // (40000 - 20000) over 1 day = 20000/day
    expect(e?.reviewVelocityPerDay).toBeCloseTo(20000, 0);
    // (25000 - 10000)/10000 = 1.5
    expect(e?.playerVelocityPct).toBeCloseTo(1.5, 6);
  });

  it("ranks entries by virality score descending", async () => {
    const r = await computeSteamBreakouts({
      source: fakeSource([
        obs({ externalId: 1, name: "Stale", reviewTotal: 100, releaseDate: "2024-01-01T00:00:00.000Z" }),
        obs({ externalId: 2, name: "Hot", reviewTotal: 50000, positivePct: 0.95 }),
      ]),
      priorState: null,
      priorCatalog: null,
      now: NOW,
    });
    expect(r.view.entries.map((e) => e.name)).toEqual(["Hot", "Stale"]);
  });

  it("accumulates the catalog, keeps best score, assigns slugs, and retains prior games", async () => {
    const priorCatalog: SteamCatalogFile = {
      schemaVersion: 1,
      generatedAt: new Date(NOW - 10 * DAY).toISOString(),
      entries: [
        {
          slug: "old-hit",
          source: "steam",
          appId: 999,
          name: "Old Hit",
          storeUrl: "https://store.steampowered.com/app/999",
          headerImageUrl: null,
          shortDescription: null,
          releaseDate: null,
          genres: [],
          tags: [],
          firstSeenAt: new Date(NOW - 10 * DAY).toISOString(),
          lastSeenAt: new Date(NOW - 10 * DAY).toISOString(),
          bestViralityScore: 42,
        },
      ],
    };
    const r = await computeSteamBreakouts({
      source: fakeSource([
        obs({ externalId: 4704690, name: "MECCHA CHAMELEON", reviewTotal: 40000, positivePct: 0.95 }),
      ]),
      priorState: null,
      priorCatalog,
      now: NOW,
    });
    const slugs = r.catalog.entries.map((e) => e.slug).sort();
    expect(slugs).toContain("old-hit");
    expect(slugs).toContain("meccha-chameleon");
    // prior game retained even though not surfaced this run
    expect(r.catalog.entries.find((e) => e.appId === 999)).toBeTruthy();
  });

  it("prunes state for apps not re-observed within the retention window", async () => {
    const priorState: SteamStateFile = {
      schemaVersion: 1,
      generatedAt: new Date(NOW - 60 * DAY).toISOString(),
      apps: {
        "111": {
          name: "Ancient",
          firstSeenAt: new Date(NOW - 60 * DAY).toISOString(),
          lastReviewTotal: 5,
          lastReviewAt: new Date(NOW - 60 * DAY).toISOString(),
          lastPlayers: null,
          lastPlayersAt: null,
          releaseDate: null,
          genres: [],
          tags: [],
        },
      },
    };
    const r = await computeSteamBreakouts({
      source: fakeSource([obs({ externalId: 2, name: "Fresh", reviewTotal: 1000 })]),
      priorState,
      priorCatalog: null,
      now: NOW,
    });
    expect(r.nextState.apps["111"]).toBeUndefined();
    expect(r.nextState.apps["2"]).toBeTruthy();
  });
});

describe("computeAgeDays", () => {
  it("returns floored days since release", () => {
    expect(computeAgeDays("2026-06-10T00:00:00.000Z", NOW)).toBe(6);
  });
  it("returns null for missing or unparseable dates", () => {
    expect(computeAgeDays(null, NOW)).toBeNull();
    expect(computeAgeDays("coming soon", NOW)).toBeNull();
  });
});

describe("slugify", () => {
  it("kebab-cases and strips punctuation", () => {
    expect(slugify("MECCHA CHAMELEON")).toBe("meccha-chameleon");
    expect(slugify("Only Up!")).toBe("only-up");
    expect(slugify("  --weird-- ")).toBe("weird");
  });
});
