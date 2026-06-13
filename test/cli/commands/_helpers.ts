import { vi } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import type { HostedDataClient } from "../../../src/core/hosted-data.js";
import type { RobloxClient } from "../../../src/core/roblox-client.js";
import type { SnapshotStore } from "../../../src/core/snapshots.js";
import type { Game, GameSummary } from "../../../src/core/types.js";

/**
 * Build a fake-client / fake-store runner. The CLI's `runCli` exposes
 * `clientFactory` / `storeFactory` / `hostedFactory` injection points so we
 * don't need to `vi.mock` the core modules — we hand it stubs directly.
 * `hostedStub` defaults to undefined so tests never touch the real CDN.
 */
export type ClientStub = {
  [K in keyof RobloxClient]?: RobloxClient[K];
};

export type StoreStub = {
  [K in keyof SnapshotStore]?: SnapshotStore[K];
};

export type HostedStub = {
  [K in keyof HostedDataClient]?: HostedDataClient[K];
};

export function makeRunner(stub: ClientStub, storeStub: StoreStub = {}, hostedStub?: HostedStub) {
  const exit = vi.fn();
  return async (argv: string[]) => {
    await runCli(["node", "bloxscout", ...argv], {
      clientFactory: () => stub as unknown as RobloxClient,
      storeFactory: () => storeStub as unknown as SnapshotStore,
      hostedFactory: () =>
        hostedStub === undefined ? undefined : (hostedStub as unknown as HostedDataClient),
      exit: exit as unknown as (code: number) => void,
    });
    return exit;
  };
}

/** Canonical `Game` fixture — matches the shape of `/v1/games`. */
export function gameFixture(id: number, overrides: Partial<Game> = {}): Game {
  return {
    id,
    rootPlaceId: id * 10,
    name: `Game ${id}`,
    description: `desc ${id}`,
    sourceName: `Game ${id}`,
    sourceDescription: `desc ${id}`,
    creator: {
      id: 1000 + id,
      name: `Creator ${id}`,
      type: "Group",
      isRNVAccount: false,
      hasVerifiedBadge: false,
    },
    price: null,
    allowedGearGenres: [],
    allowedGearCategories: [],
    isGenreEnforced: false,
    copyingAllowed: false,
    playing: 100,
    visits: 1_000_000,
    maxPlayers: 30,
    created: "2020-01-01T00:00:00Z",
    updated: "2026-05-01T00:00:00Z",
    studioAccessToApisAllowed: false,
    createVipServersAllowed: false,
    universeAvatarType: "MorphToR15",
    genre: "Adventure",
    genre_l1: "Adventure",
    genre_l2: "OpenWorld",
    isAllGenre: false,
    isFavoritedByUser: false,
    favoritedCount: 42,
    ...overrides,
  };
}

export function summaryFixture(id: number, playerCount: number): GameSummary {
  return {
    universeId: id,
    rootPlaceId: id * 10,
    name: `Game ${id}`,
    description: "",
    playerCount,
    totalUpVotes: 0,
    totalDownVotes: 0,
    creatorId: 1,
    creatorName: "creator",
    creatorHasVerifiedBadge: false,
    contentId: id,
    contentType: "Game",
  };
}
