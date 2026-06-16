import { BloxscoutCache } from "@bloxscout/core/cache";
import { SteamClient, parseOwnersBand } from "@bloxscout/core/steam-client";
import { MockAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const MECCHA = 4704690;

function makeClient() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  const client = new SteamClient({
    cache: new BloxscoutCache(),
    dispatcher: agent,
    sleep: async () => {},
  });
  return { client, agent };
}

describe("SteamClient", () => {
  let agent: MockAgent;
  let client: SteamClient;

  beforeEach(() => {
    ({ client, agent } = makeClient());
  });

  afterEach(async () => {
    await agent.close();
  });

  it("getFeaturedApps flattens candidate lists and dedupes, recording lists", async () => {
    agent
      .get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/api/featuredcategories") })
      .reply(200, {
        new_releases: {
          items: [
            { id: MECCHA, name: "MECCHA CHAMELEON" },
            { id: 111, name: "A" },
          ],
        },
        top_sellers: {
          items: [
            { id: MECCHA, name: "MECCHA CHAMELEON" },
            { id: 222, name: "B" },
          ],
        },
        coming_soon: { items: [{ id: 333, name: "C" }] },
        specials: { items: [{ id: 999, name: "ignored" }] },
      });

    const apps = await client.getFeaturedApps();
    const ids = apps.map((a) => a.appId).sort((a, b) => a - b);
    expect(ids).toEqual([111, 222, 333, MECCHA]);
    const meccha = apps.find((a) => a.appId === MECCHA);
    expect(meccha?.lists.sort()).toEqual(["new_releases", "top_sellers"]);
    // specials is not a candidate list
    expect(apps.find((a) => a.appId === 999)).toBeUndefined();
  });

  it("getAppDetails normalizes a paid game", async () => {
    agent
      .get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/api/appdetails") })
      .reply(200, {
        [MECCHA]: {
          success: true,
          data: {
            name: "MECCHA CHAMELEON",
            type: "game",
            short_description: "Paint to blend in.",
            genres: [{ description: "Casual" }, { description: "Indie" }],
            release_date: { coming_soon: false, date: "10 Jun, 2026" },
            price_overview: { final: 799 },
            header_image: "https://img/header.jpg",
            developers: ["Tiny Team"],
            publishers: ["Tiny Team", ""],
          },
        },
      });

    const d = await client.getAppDetails(MECCHA);
    expect(d).not.toBeNull();
    expect(d?.name).toBe("MECCHA CHAMELEON");
    expect(d?.genres).toEqual(["Casual", "Indie"]);
    expect(d?.priceUsd).toBeCloseTo(7.99, 6);
    expect(d?.comingSoon).toBe(false);
    expect(d?.releaseDate).toBe("10 Jun, 2026");
    expect(d?.developers).toEqual(["Tiny Team"]);
    // empty strings filtered out
    expect(d?.publishers).toEqual(["Tiny Team"]);
  });

  it("getAppDetails treats is_free and missing page", async () => {
    agent
      .get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/api/appdetails") })
      .reply(200, {
        "111": { success: true, data: { name: "Freebie", is_free: true } },
      });
    const free = await client.getAppDetails(111);
    expect(free?.priceUsd).toBe(0);

    const { client: c2, agent: a2 } = makeClient();
    a2.get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/api/appdetails") })
      .reply(200, { "222": { success: false } });
    expect(await c2.getAppDetails(222)).toBeNull();
    await a2.close();
  });

  it("getReviewSummary computes positive fraction and handles zero reviews", async () => {
    agent
      .get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith(`/appreviews/${MECCHA}`) })
      .reply(200, {
        success: 1,
        query_summary: {
          total_reviews: 40000,
          total_positive: 38000,
          total_negative: 2000,
          review_score_desc: "Overwhelmingly Positive",
        },
      });
    const s = await client.getReviewSummary(MECCHA);
    expect(s?.totalReviews).toBe(40000);
    expect(s?.positivePct).toBeCloseTo(0.95, 6);
    expect(s?.reviewScoreDesc).toBe("Overwhelmingly Positive");

    const { client: c2, agent: a2 } = makeClient();
    a2.get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/appreviews/777") })
      .reply(200, { success: 1, query_summary: { total_reviews: 0, total_positive: 0 } });
    const empty = await c2.getReviewSummary(777);
    expect(empty?.positivePct).toBeNull();
    await a2.close();
  });

  it("getSteamSpy parses owners band and sorts tags by votes", async () => {
    agent
      .get("https://steamspy.com")
      .intercept({ path: (p) => p.startsWith("/api.php") })
      .reply(200, {
        owners: "1,000,000 .. 2,000,000",
        average_forever: 240,
        tags: { "Hide and Seek": 500, Casual: 1200, Multiplayer: 800 },
      });
    const spy = await client.getSteamSpy(MECCHA);
    expect(spy?.ownersLow).toBe(1_000_000);
    expect(spy?.ownersHigh).toBe(2_000_000);
    expect(spy?.avgPlaytimeMin).toBe(240);
    expect(spy?.tags).toEqual(["Casual", "Multiplayer", "Hide and Seek"]);
  });

  it("getCurrentPlayers returns count on result=1, null otherwise", async () => {
    agent
      .get("https://api.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/ISteamUserStats/GetNumberOfCurrentPlayers") })
      .reply(200, { response: { result: 1, player_count: 53000 } });
    expect(await client.getCurrentPlayers(MECCHA)).toBe(53000);

    const { client: c2, agent: a2 } = makeClient();
    a2.get("https://api.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/ISteamUserStats/GetNumberOfCurrentPlayers") })
      .reply(200, { response: { result: 42 } });
    expect(await c2.getCurrentPlayers(111)).toBeNull();
    await a2.close();
  });

  it("retries on 5xx then succeeds", async () => {
    const pool = agent.get("https://api.steampowered.com");
    pool
      .intercept({ path: (p) => p.startsWith("/ISteamUserStats/GetNumberOfCurrentPlayers") })
      .reply(500, "boom");
    pool
      .intercept({ path: (p) => p.startsWith("/ISteamUserStats/GetNumberOfCurrentPlayers") })
      .reply(200, { response: { result: 1, player_count: 7 } });
    expect(await client.getCurrentPlayers(MECCHA)).toBe(7);
  });
});

describe("parseOwnersBand", () => {
  it("parses a comma-separated band", () => {
    expect(parseOwnersBand("1,000,000 .. 2,000,000")).toEqual([1_000_000, 2_000_000]);
  });
  it("returns nulls for undefined", () => {
    expect(parseOwnersBand(undefined)).toEqual([null, null]);
  });
});
