import type { HostedDataClient } from "@bloxscout/core/hosted-data";
import type { RobloxClient } from "@bloxscout/core/roblox-client";
import type { SnapshotStore } from "@bloxscout/core/snapshots";
import { vi } from "vitest";
import type { ToolContext } from "../../../src/mcp/tools/types.js";

export interface MakeCtxExtras {
  /** Stubbed hosted-data client (only the methods the tool under test uses). */
  hosted?: Partial<Record<keyof HostedDataClient, ReturnType<typeof vi.fn>>>;
  /** Stubbed snapshot store. */
  store?: Partial<Record<keyof SnapshotStore, ReturnType<typeof vi.fn>>>;
}

/**
 * Build a test `ToolContext` whose `client` is a vitest-mocked `RobloxClient`.
 * Only the methods named in `methods` are stubbed; calling any other method
 * yields the default vitest `MockedFunction` behavior (returns undefined),
 * which surfaces missing-stub mistakes as obvious test failures.
 */
export function makeCtx(
  overrides: Partial<Record<keyof RobloxClient, ReturnType<typeof vi.fn>>> = {},
  extras: MakeCtxExtras = {},
): { ctx: ToolContext; client: Record<string, ReturnType<typeof vi.fn>> } {
  const client = {
    searchGames: vi.fn(),
    getGames: vi.fn(),
    getPlayerCounts: vi.fn(),
    getCreator: vi.fn(),
    getGroup: vi.fn(),
    getGameIcons: vi.fn(),
    getCreatorGames: vi.fn(),
    getTrendingGames: vi.fn(),
    ...overrides,
  };
  const ctx: ToolContext = { client: client as unknown as RobloxClient };
  if (extras.hosted !== undefined) {
    ctx.hosted = extras.hosted as unknown as HostedDataClient;
  }
  if (extras.store !== undefined) {
    ctx.store = extras.store as unknown as SnapshotStore;
  }
  return { client, ctx };
}

/** Minimal Game fixture with overridable numeric fields. */
export function gameFixture(
  id: number,
  overrides: Partial<{
    name: string;
    playing: number;
    visits: number;
    favoritedCount: number;
    maxPlayers: number;
    genre_l1: string;
    genre: string;
  }> = {},
) {
  return {
    id,
    rootPlaceId: id * 10,
    name: overrides.name ?? `Game ${id}`,
    description: "",
    sourceName: null,
    sourceDescription: null,
    creator: {
      id: 1,
      name: "creator",
      type: "User" as const,
      isRNVAccount: false,
      hasVerifiedBadge: false,
    },
    price: null,
    allowedGearGenres: [],
    allowedGearCategories: [],
    isGenreEnforced: false,
    copyingAllowed: false,
    playing: overrides.playing ?? 0,
    visits: overrides.visits ?? 0,
    maxPlayers: overrides.maxPlayers ?? 10,
    created: "2020-01-01T00:00:00Z",
    updated: "2020-01-02T00:00:00Z",
    studioAccessToApisAllowed: false,
    createVipServersAllowed: false,
    universeAvatarType: "MorphToR15",
    genre: overrides.genre ?? "All",
    genre_l1: overrides.genre_l1 ?? "",
    genre_l2: "",
    isAllGenre: true,
    isFavoritedByUser: false,
    favoritedCount: overrides.favoritedCount ?? 0,
  };
}
