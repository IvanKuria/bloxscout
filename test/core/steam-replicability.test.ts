import { assessReplicability } from "@bloxscout/core/steam-replicability";
import { describe, expect, it } from "vitest";

function signals(over: Partial<Parameters<typeof assessReplicability>[0]> = {}) {
  return {
    priceUsd: 9.99,
    developers: [],
    publishers: [],
    genres: ["Indie"],
    tags: [],
    ...over,
  };
}

describe("assessReplicability — hard exclude (AAA)", () => {
  it("excludes games priced at or above the AAA floor", () => {
    const r = assessReplicability(signals({ priceUsd: 59.99 }));
    expect(r.replicable).toBe(false);
    expect(r.excludeReason).toMatch(/pric/i);
  });

  it("keeps cheap games on price grounds", () => {
    expect(assessReplicability(signals({ priceUsd: 14.99 })).replicable).toBe(true);
    expect(assessReplicability(signals({ priceUsd: 0 })).replicable).toBe(true);
  });

  it("excludes known AAA publishers/developers (case-insensitive)", () => {
    expect(assessReplicability(signals({ publishers: ["Electronic Arts"] })).replicable).toBe(
      false,
    );
    expect(assessReplicability(signals({ developers: ["ubisoft montreal"] })).replicable).toBe(
      false,
    );
    const reason = assessReplicability(signals({ publishers: ["Rockstar Games"] })).excludeReason;
    expect(reason).toMatch(/publisher|AAA/i);
  });

  it("does not exclude small/indie publishers", () => {
    expect(assessReplicability(signals({ publishers: ["Landfall Games"] })).replicable).toBe(true);
  });

  it("excludes a discounted AAA title via the publisher backstop even under the price floor", () => {
    // $29.99 (under the $35 floor) but published by a megapublisher.
    const r = assessReplicability(signals({ priceUsd: 29.99, publishers: ["2K Games"] }));
    expect(r.replicable).toBe(false);
  });
});

describe("assessReplicability — replicabilityScore (soft rank)", () => {
  it("scores 'friend slop' (cheap co-op/party/funny) higher than a generic indie", () => {
    const friendSlop = assessReplicability(
      signals({
        priceUsd: 4.99,
        genres: ["Indie", "Casual"],
        tags: ["Co-op", "Multiplayer", "Funny", "Party Game"],
      }),
    );
    const generic = assessReplicability(
      signals({ priceUsd: 19.99, genres: ["Indie"], tags: ["Atmospheric"] }),
    );
    expect(friendSlop.replicabilityScore).toBeGreaterThan(generic.replicabilityScore);
    expect(friendSlop.replicabilityScore).toBeGreaterThan(0.7);
  });

  it("penalizes mechanically complex genres (but does not hard-exclude them)", () => {
    const complex = assessReplicability(
      signals({ priceUsd: 19.99, genres: ["RPG"], tags: ["Open World", "Story Rich"] }),
    );
    const simple = assessReplicability(
      signals({ priceUsd: 19.99, genres: ["Casual"], tags: ["2D Platformer"] }),
    );
    expect(complex.replicable).toBe(true);
    expect(complex.replicabilityScore).toBeLessThan(simple.replicabilityScore);
  });

  it("rewards free/cheap pricing via affordability", () => {
    const free = assessReplicability(signals({ priceUsd: 0 }));
    const pricey = assessReplicability(signals({ priceUsd: 29.99 }));
    expect(free.factors.affordability).toBe(1);
    expect(free.factors.affordability).toBeGreaterThan(pricey.factors.affordability);
  });

  it("keeps replicabilityScore within [0, 1]", () => {
    for (const s of [
      signals({ priceUsd: 0, tags: ["Co-op", "Party Game", "Funny", "Physics", "Casual"] }),
      signals({ priceUsd: 29.99, genres: ["RPG"], tags: ["Open World", "Simulation"] }),
    ]) {
      const r = assessReplicability(s);
      expect(r.replicabilityScore).toBeGreaterThanOrEqual(0);
      expect(r.replicabilityScore).toBeLessThanOrEqual(1);
    }
  });
});
