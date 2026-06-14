import { describe, expect, it } from "vitest";
import {
  applyIngestResults,
  emptyRegistry,
  markDormant,
  upsertDiscovered,
} from "../../pipeline/registry.js";

const NOW = "2026-06-12T00:00:00.000Z";
const EIGHT_DAYS_AGO = "2026-06-04T00:00:00.000Z";

describe("upsertDiscovered", () => {
  it("adds new games as active with discovery timestamps", () => {
    const registry = emptyRegistry(NOW);
    upsertDiscovered(registry, [{ universeId: 42, name: "Tower Heroes" }], NOW);
    expect(registry.games["42"]).toEqual({
      name: "Tower Heroes",
      genre: null,
      addedAt: NOW,
      lastSeenAt: NOW,
      lastDiscoveredAt: NOW,
      tier: "active",
    });
  });

  it("refreshes lastDiscoveredAt and name but keeps addedAt for known games", () => {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "Old Name" }], EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "New Name" }], NOW);
    expect(registry.games["42"]?.addedAt).toBe(EIGHT_DAYS_AGO);
    expect(registry.games["42"]?.lastDiscoveredAt).toBe(NOW);
    expect(registry.games["42"]?.name).toBe("New Name");
  });

  it("reactivates dormant games when rediscovered", () => {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "G" }], EIGHT_DAYS_AGO);
    const entry = registry.games["42"];
    if (entry) entry.tier = "dormant";
    upsertDiscovered(registry, [{ universeId: 42, name: "G" }], NOW);
    expect(registry.games["42"]?.tier).toBe("active");
  });
});

describe("applyIngestResults", () => {
  it("updates name, genre, and lastSeenAt for fetched games", () => {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "G" }], EIGHT_DAYS_AGO);
    applyIngestResults(registry, [{ id: 42, name: "G!", genre: "Simulation" }], NOW);
    const entry = registry.games["42"];
    expect(entry?.name).toBe("G!");
    expect(entry?.genre).toBe("Simulation");
    expect(entry?.lastSeenAt).toBe(NOW);
  });

  it("records createdAt once and seeds updateCount at 0 on first sighting", () => {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "G" }], EIGHT_DAYS_AGO);
    applyIngestResults(
      registry,
      [
        {
          id: 42,
          name: "G",
          genre: "Sim",
          created: "2020-01-01T00:00:00.000Z",
          updated: "2026-06-01T00:00:00.000Z",
        },
      ],
      NOW,
    );
    const entry = registry.games["42"];
    expect(entry?.createdAt).toBe("2020-01-01T00:00:00.000Z");
    expect(entry?.lastUpdatedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(entry?.updateCount).toBe(0);
  });

  it("increments updateCount when the game's updated timestamp changes", () => {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "G" }], EIGHT_DAYS_AGO);
    const base = {
      id: 42,
      name: "G",
      genre: "Sim",
      created: "2020-01-01T00:00:00.000Z",
    };
    applyIngestResults(
      registry,
      [{ ...base, updated: "2026-06-01T00:00:00.000Z" }],
      EIGHT_DAYS_AGO,
    );
    // Same updated timestamp again — no new ship, count stays.
    applyIngestResults(registry, [{ ...base, updated: "2026-06-01T00:00:00.000Z" }], NOW);
    expect(registry.games["42"]?.updateCount).toBe(0);
    // A newer updated timestamp — counts as one observed ship.
    applyIngestResults(registry, [{ ...base, updated: "2026-06-10T00:00:00.000Z" }], NOW);
    const entry = registry.games["42"];
    expect(entry?.updateCount).toBe(1);
    expect(entry?.lastUpdatedAt).toBe("2026-06-10T00:00:00.000Z");
    // createdAt never drifts.
    expect(entry?.createdAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("leaves cadence fields untouched when created/updated are absent", () => {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 42, name: "G" }], EIGHT_DAYS_AGO);
    applyIngestResults(registry, [{ id: 42, name: "G", genre: "Sim" }], NOW);
    const entry = registry.games["42"];
    expect(entry?.createdAt).toBeUndefined();
    expect(entry?.lastUpdatedAt).toBeUndefined();
    expect(entry?.updateCount).toBeUndefined();
  });
});

describe("markDormant", () => {
  function seeded(): ReturnType<typeof emptyRegistry> {
    const registry = emptyRegistry(EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 1, name: "stale-low" }], EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 2, name: "stale-high" }], EIGHT_DAYS_AGO);
    upsertDiscovered(registry, [{ universeId: 3, name: "fresh-low" }], NOW);
    return registry;
  }

  it("demotes games unseen by discovery for 7d with low 7d peak CCU", () => {
    const registry = seeded();
    const demoted = markDormant(registry, (id) => (id === 2 ? 5000 : 2), NOW);
    expect(demoted).toEqual([1]);
    expect(registry.games["1"]?.tier).toBe("dormant");
    expect(registry.games["2"]?.tier).toBe("active");
    expect(registry.games["3"]?.tier).toBe("active");
  });

  it("treats unknown peaks (no history yet) as low but keeps fresh games active", () => {
    const registry = seeded();
    const demoted = markDormant(registry, () => null, NOW);
    expect(demoted.sort()).toEqual([1, 2]);
    expect(registry.games["3"]?.tier).toBe("active");
  });
});
