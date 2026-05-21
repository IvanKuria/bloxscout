import { MockAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BloxscoutCache } from "../../src/core/cache.js";
import { RobloxClient } from "../../src/core/roblox-client.js";
import {
  BloxscoutError,
  RobloxApiError,
  RobloxNotFoundError,
  RobloxRateLimitError,
} from "../../src/shared/errors.js";

/**
 * Helper: build a fresh client + MockAgent pair. We inject a no-op `sleep`
 * so retry-with-backoff tests don't actually pause.
 */
function makeClient(opts: { maxRetries?: number } = {}) {
  const agent = new MockAgent();
  agent.disableNetConnect();
  const cache = new BloxscoutCache();
  const client = new RobloxClient({
    cache,
    dispatcher: agent,
    sleep: async () => {},
    maxRetries: opts.maxRetries ?? 3,
  });
  return { client, agent, cache };
}

describe("RobloxClient.searchGames", () => {
  let agent: MockAgent;
  let client: RobloxClient;

  beforeEach(() => {
    ({ client, agent } = makeClient());
  });

  afterEach(async () => {
    await agent.close();
  });

  it("flattens Game-typed search results and trims to limit", async () => {
    agent
      .get("https://apis.roblox.com")
      .intercept({ path: (p) => p.startsWith("/search-api/omni-search") })
      .reply(200, {
        searchResults: [
          {
            contentGroupType: "Game",
            contents: [
              {
                universeId: 1,
                rootPlaceId: 10,
                name: "A",
                description: "",
                playerCount: 100,
                totalUpVotes: 1,
                totalDownVotes: 0,
                creatorId: 5,
                creatorName: "c",
                creatorHasVerifiedBadge: false,
                contentId: 1,
                contentType: "Game",
              },
              {
                universeId: 2,
                rootPlaceId: 20,
                name: "B",
                description: "",
                playerCount: 50,
                totalUpVotes: 2,
                totalDownVotes: 1,
                creatorId: 6,
                creatorName: "d",
                creatorHasVerifiedBadge: false,
                contentId: 2,
                contentType: "Game",
              },
            ],
          },
          // Non-Game groups are ignored
          { contentGroupType: "User", contents: [{ id: 999 }] },
        ],
      });

    const out = await client.searchGames("tycoon", { limit: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]?.universeId).toBe(1);
  });

  it("rejects empty keyword without making a request", async () => {
    await expect(client.searchGames("   ")).rejects.toBeInstanceOf(BloxscoutError);
  });
});

describe("RobloxClient.getGames", () => {
  let agent: MockAgent;
  let client: RobloxClient;

  beforeEach(() => {
    ({ client, agent } = makeClient());
  });

  afterEach(async () => {
    await agent.close();
  });

  it("returns games preserving input order", async () => {
    agent
      .get("https://games.roblox.com")
      .intercept({ path: (p) => p.startsWith("/v1/games") })
      .reply(200, {
        data: [gameFixture(2, "Two"), gameFixture(1, "One")],
      });

    const games = await client.getGames([1, 2]);
    expect(games.map((g) => g.id)).toEqual([1, 2]);
  });

  it("chunks calls at the GAMES_BATCH_SIZE limit (#36: now 50 per request)", async () => {
    // Roblox tightened the per-request universe-id cap on
    // games.roblox.com/v1/games — 100 ids now returns
    // {"code":9,"message":"Too many universe IDs"}. The client batches at 50.
    // 150 ids should split into 3 requests of 50.
    const pool = agent.get("https://games.roblox.com");
    let calls = 0;
    pool
      .intercept({ path: (p) => p.startsWith("/v1/games") })
      .reply(200, () => {
        calls++;
        return { data: [gameFixture(1, "x")] };
      })
      .times(3);

    const ids = Array.from({ length: 150 }, (_, i) => i + 1);
    await client.getGames(ids);
    expect(calls).toBe(3);
  });

  it("chunks an odd-size batch (75 ids -> 50 + 25, #36)", async () => {
    // Regression for #36: an external caller passing 75 ids should succeed
    // with two requests (50 + 25), not one request of 75 that Roblox would
    // reject with "Too many universe IDs".
    const pool = agent.get("https://games.roblox.com");
    const seenIdCounts: number[] = [];
    pool
      .intercept({ path: (p) => p.startsWith("/v1/games") })
      .reply(200, ({ path }) => {
        const url = new URL(path, "https://games.roblox.com");
        const ids = url.searchParams.get("universeIds")?.split(",") ?? [];
        seenIdCounts.push(ids.length);
        return { data: [gameFixture(Number(ids[0]), "x")] };
      })
      .times(2);

    const ids = Array.from({ length: 75 }, (_, i) => i + 1);
    await client.getGames(ids);
    expect(seenIdCounts).toEqual([50, 25]);
  });

  it("getPlayerCounts projects to {universeId, playing, visits}", async () => {
    agent
      .get("https://games.roblox.com")
      .intercept({ path: (p) => p.startsWith("/v1/games") })
      .reply(200, { data: [gameFixture(1, "One", { playing: 42, visits: 7 })] });

    const counts = await client.getPlayerCounts([1]);
    expect(counts).toEqual([{ universeId: 1, playing: 42, visits: 7 }]);
  });
});

describe("RobloxClient.getCreator / getGroup / getGameIcons / getCreatorGames", () => {
  let agent: MockAgent;
  let client: RobloxClient;

  beforeEach(() => {
    ({ client, agent } = makeClient());
  });

  afterEach(async () => {
    await agent.close();
  });

  it("getCreator returns a user", async () => {
    agent.get("https://users.roblox.com").intercept({ path: "/v1/users/1" }).reply(200, {
      id: 1,
      name: "Roblox",
      displayName: "Roblox",
      description: "",
      created: "2006-02-27T21:06:40.3Z",
      isBanned: false,
      externalAppDisplayName: null,
      hasVerifiedBadge: true,
    });

    const user = await client.getCreator(1);
    expect(user.name).toBe("Roblox");
  });

  it("getCreator throws RobloxNotFoundError on 404", async () => {
    agent
      .get("https://users.roblox.com")
      .intercept({ path: "/v1/users/999" })
      .reply(404, { errors: [{ code: 3, message: "The user id is invalid." }] });

    await expect(client.getCreator(999)).rejects.toBeInstanceOf(RobloxNotFoundError);
  });

  it("getGroup returns a group", async () => {
    agent
      .get("https://groups.roblox.com")
      .intercept({ path: "/v1/groups/7" })
      .reply(200, {
        id: 7,
        name: "Roblox",
        description: "",
        owner: { hasVerifiedBadge: false, userId: 21557, username: "Games", displayName: "Games" },
        shout: null,
        memberCount: 1,
        isBuildersClubOnly: false,
        publicEntryAllowed: true,
        hasVerifiedBadge: true,
      });

    const group = await client.getGroup(7);
    expect(group.id).toBe(7);
  });

  it("getGameIcons returns icon array", async () => {
    agent
      .get("https://thumbnails.roblox.com")
      .intercept({ path: (p) => p.startsWith("/v1/games/icons") })
      .reply(200, {
        data: [{ targetId: 1, state: "Completed", imageUrl: "https://x" }],
      });

    const icons = await client.getGameIcons([1]);
    expect(icons[0]?.imageUrl).toBe("https://x");
  });

  it("getCreatorGames returns published games", async () => {
    agent
      .get("https://games.roblox.com")
      .intercept({ path: (p) => p.startsWith("/v2/users/1/games") })
      .reply(200, {
        data: [
          {
            id: 295594,
            name: "Classic: Chaos Canyon",
            description: "",
            creator: { id: 1, type: "User" },
            rootPlace: { id: 14403, type: "Place" },
            created: "2013-10-31T22:09:58.407Z",
            updated: "2026-05-20T23:16:31.112Z",
            placeVisits: 1145054,
          },
        ],
      });
    const games = await client.getCreatorGames(1);
    expect(games[0]?.placeVisits).toBe(1145054);
  });
});

describe("RobloxClient retry + cache behavior", () => {
  let agent: MockAgent;
  let client: RobloxClient;
  let cache: BloxscoutCache;

  beforeEach(() => {
    ({ client, agent, cache } = makeClient({ maxRetries: 3 }));
  });

  afterEach(async () => {
    await agent.close();
  });

  it("retries 5xx and eventually returns the success body", async () => {
    const pool = agent.get("https://users.roblox.com");
    let attempts = 0;
    pool
      .intercept({ path: "/v1/users/42" })
      .reply(() => {
        attempts++;
        if (attempts < 3) return { statusCode: 503, data: "boom" };
        return {
          statusCode: 200,
          data: {
            id: 42,
            name: "x",
            displayName: "x",
            description: "",
            created: "now",
            isBanned: false,
            externalAppDisplayName: null,
            hasVerifiedBadge: false,
          },
        };
      })
      .times(3);

    const user = await client.getCreator(42);
    expect(user.id).toBe(42);
    expect(attempts).toBe(3);
  });

  it("retries on 429 and respects Retry-After", async () => {
    const sleepSpy = vi.fn(async (_ms: number) => {});
    const customAgent = new MockAgent();
    customAgent.disableNetConnect();
    const c = new RobloxClient({
      cache: new BloxscoutCache(),
      dispatcher: customAgent,
      sleep: sleepSpy,
      maxRetries: 2,
    });

    let attempts = 0;
    customAgent
      .get("https://users.roblox.com")
      .intercept({ path: "/v1/users/55" })
      .reply(() => {
        attempts++;
        if (attempts === 1) {
          return {
            statusCode: 429,
            data: "slow down",
            responseOptions: { headers: { "retry-after": "2" } },
          };
        }
        return {
          statusCode: 200,
          data: {
            id: 55,
            name: "x",
            displayName: "x",
            description: "",
            created: "now",
            isBanned: false,
            externalAppDisplayName: null,
            hasVerifiedBadge: false,
          },
        };
      })
      .times(2);

    const user = await c.getCreator(55);
    expect(user.id).toBe(55);
    expect(sleepSpy).toHaveBeenCalledWith(2000);
    await customAgent.close();
  });

  it("throws RobloxRateLimitError after retries are exhausted", async () => {
    const customAgent = new MockAgent();
    customAgent.disableNetConnect();
    const c = new RobloxClient({
      cache: new BloxscoutCache(),
      dispatcher: customAgent,
      sleep: async () => {},
      maxRetries: 1,
    });
    customAgent
      .get("https://users.roblox.com")
      .intercept({ path: "/v1/users/66" })
      .reply(429, "no")
      .times(2);
    await expect(c.getCreator(66)).rejects.toBeInstanceOf(RobloxRateLimitError);
    await customAgent.close();
  });

  it("does not retry on 400 — fails fast", async () => {
    let attempts = 0;
    agent
      .get("https://groups.roblox.com")
      .intercept({ path: "/v1/groups/77" })
      .reply(() => {
        attempts++;
        return { statusCode: 400, data: "bad" };
      });
    await expect(client.getGroup(77)).rejects.toBeInstanceOf(RobloxApiError);
    expect(attempts).toBe(1);
  });

  it("second call with same key is served from cache (no second HTTP request)", async () => {
    let calls = 0;
    agent
      .get("https://users.roblox.com")
      .intercept({ path: "/v1/users/100" })
      .reply(() => {
        calls++;
        return {
          statusCode: 200,
          data: {
            id: 100,
            name: "x",
            displayName: "x",
            description: "",
            created: "now",
            isBanned: false,
            externalAppDisplayName: null,
            hasVerifiedBadge: false,
          },
        };
      });
    await client.getCreator(100);
    await client.getCreator(100);
    expect(calls).toBe(1);
    expect(cache.has("user:100")).toBe(true);
  });
});

describe("RobloxClient.getTrendingGames stub", () => {
  it("throws NOT_IMPLEMENTED", async () => {
    const { client, agent } = makeClient();
    await expect(client.getTrendingGames()).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
    await agent.close();
  });
});

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function gameFixture(
  id: number,
  name: string,
  overrides: Partial<{ playing: number; visits: number }> = {},
) {
  return {
    id,
    rootPlaceId: id * 10,
    name,
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
    maxPlayers: 10,
    created: "2020-01-01T00:00:00Z",
    updated: "2020-01-02T00:00:00Z",
    studioAccessToApisAllowed: false,
    createVipServersAllowed: false,
    universeAvatarType: "MorphToR15",
    genre: "All",
    genre_l1: "",
    genre_l2: "",
    isAllGenre: true,
    isFavoritedByUser: false,
    favoritedCount: 0,
  };
}
