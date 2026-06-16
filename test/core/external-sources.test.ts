import { BloxscoutCache } from "@bloxscout/core/cache";
import { SteamSource } from "@bloxscout/core/external-sources";
import { SteamClient } from "@bloxscout/core/steam-client";
import { MockAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const MECCHA = 4704690;

function makeSource() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  const client = new SteamClient({
    cache: new BloxscoutCache(),
    dispatcher: agent,
    sleep: async () => {},
    maxRetries: 0,
  });
  return { source: new SteamSource({ client }), agent };
}

function interceptAppDetails(agent: MockAgent, type: string) {
  agent
    .get("https://store.steampowered.com")
    .intercept({ path: (p) => p.startsWith("/api/appdetails") })
    .reply(200, {
      [MECCHA]: {
        success: true,
        data: {
          name: "MECCHA CHAMELEON",
          type,
          header_image: "h.jpg",
          release_date: { date: "10 Jun, 2026" },
        },
      },
    });
}

describe("SteamSource.enrich", () => {
  let agent: MockAgent;

  afterEach(async () => {
    await agent.close();
  });

  it("combines store + reviews + steamspy + players into one observation", async () => {
    let source: SteamSource;
    ({ source, agent } = makeSource());
    interceptAppDetails(agent, "game");
    agent
      .get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith(`/appreviews/${MECCHA}`) })
      .reply(200, { success: 1, query_summary: { total_reviews: 40000, total_positive: 38000 } });
    agent
      .get("https://steamspy.com")
      .intercept({ path: (p) => p.startsWith("/api.php") })
      .reply(200, { owners: "1,000,000 .. 2,000,000", tags: { Casual: 10 } });
    agent
      .get("https://api.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/ISteamUserStats/GetNumberOfCurrentPlayers") })
      .reply(200, { response: { result: 1, player_count: 50000 } });

    const o = await source.enrich(MECCHA);
    expect(o?.name).toBe("MECCHA CHAMELEON");
    expect(o?.reviewTotal).toBe(40000);
    expect(o?.positivePct).toBeCloseTo(0.95, 6);
    expect(o?.ownersHigh).toBe(2_000_000);
    expect(o?.tags).toEqual(["Casual"]);
    expect(o?.currentPlayers).toBe(50000);
    expect(o?.storeUrl).toBe(`https://store.steampowered.com/app/${MECCHA}`);
  });

  it("skips non-game store types (dlc, bundles)", async () => {
    let source: SteamSource;
    ({ source, agent } = makeSource());
    interceptAppDetails(agent, "dlc");
    expect(await source.enrich(MECCHA)).toBeNull();
  });

  it("degrades a failing sub-signal to null instead of throwing", async () => {
    let source: SteamSource;
    ({ source, agent } = makeSource());
    interceptAppDetails(agent, "game");
    agent
      .get("https://store.steampowered.com")
      .intercept({ path: (p) => p.startsWith(`/appreviews/${MECCHA}`) })
      .reply(200, { success: 1, query_summary: { total_reviews: 100, total_positive: 90 } });
    // steamspy + players fail outright → best-effort null
    agent
      .get("https://steamspy.com")
      .intercept({ path: (p) => p.startsWith("/api.php") })
      .reply(500, "down");
    agent
      .get("https://api.steampowered.com")
      .intercept({ path: (p) => p.startsWith("/ISteamUserStats/GetNumberOfCurrentPlayers") })
      .reply(500, "down");

    const o = await source.enrich(MECCHA);
    expect(o).not.toBeNull();
    expect(o?.reviewTotal).toBe(100);
    expect(o?.ownersLow).toBeNull();
    expect(o?.tags).toEqual([]);
    expect(o?.currentPlayers).toBeNull();
  });
});
