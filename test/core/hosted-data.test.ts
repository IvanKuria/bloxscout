import { gzipSync } from "node:zlib";
import { MockAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BloxscoutCache } from "../../src/core/cache.js";
import { HostedDataClient } from "../../src/core/hosted-data.js";
import { HOSTED_SCHEMA_VERSION } from "../../src/shared/hosted-format.js";

const ORIGIN = "https://raw.githubusercontent.com";
const BASE_PATH = "/IvanKuria/bloxscout-data/main/";

const trendingView = {
  schemaVersion: HOSTED_SCHEMA_VERSION,
  generatedAt: "2026-06-12T12:00:00.000Z",
  entries: [
    {
      universeId: 42,
      name: "Tower Heroes",
      genre: "Strategy",
      playing: 12000,
      avg24h: 9000,
      peak24h: 15000,
      growth24hPct: 0.4,
      growth7dPct: 1.2,
      zScore24h: 2.5,
      visitsDelta24h: 1_000_000,
    },
  ],
};

function makeClient() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  const client = new HostedDataClient({
    baseUrl: `${ORIGIN}${BASE_PATH}`,
    cache: new BloxscoutCache(),
    dispatcher: agent,
  });
  return { client, agent };
}

describe("HostedDataClient", () => {
  let agent: MockAgent;
  let client: HostedDataClient;

  beforeEach(() => {
    ({ client, agent } = makeClient());
  });

  afterEach(async () => {
    await agent.close();
  });

  it("fetches and validates the trending view", async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: `${BASE_PATH}v1/views/trending.json` })
      .reply(200, trendingView);
    const view = await client.getTrendingView();
    expect(view?.entries[0]?.universeId).toBe(42);
    expect(view?.entries[0]?.growth24hPct).toBe(0.4);
  });

  it("returns null on HTTP errors instead of throwing", async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: `${BASE_PATH}v1/views/trending.json` })
      .reply(404, "not found");
    expect(await client.getTrendingView()).toBeNull();
  });

  it("returns null when the payload fails schema validation", async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: `${BASE_PATH}v1/views/trending.json` })
      .reply(200, { schemaVersion: 1, entries: "garbage" });
    expect(await client.getTrendingView()).toBeNull();
  });

  it("fetches the right gzipped shard for a game and plucks its history", async () => {
    const shard = {
      schemaVersion: HOSTED_SCHEMA_VERSION,
      generatedAt: "2026-06-12T12:00:00.000Z",
      games: {
        "298": {
          hourly: [[1765537200000, 100, 120, 5000, 50]],
          daily: [["2026-06-11", 90, 110, 4000, 49]],
        },
      },
    };
    agent
      .get(ORIGIN)
      // 298 % 256 = 42
      .intercept({ path: `${BASE_PATH}v1/history/42.json.gz` })
      .reply(200, gzipSync(Buffer.from(JSON.stringify(shard))));
    const history = await client.getGameHistory(298);
    expect(history?.hourly).toHaveLength(1);
    expect(history?.daily[0]?.[0]).toBe("2026-06-11");
  });

  it("returns null for a game absent from its shard", async () => {
    const shard = { schemaVersion: HOSTED_SCHEMA_VERSION, generatedAt: "x", games: {} };
    agent
      .get(ORIGIN)
      .intercept({ path: `${BASE_PATH}v1/history/1.json.gz` })
      .reply(200, gzipSync(Buffer.from(JSON.stringify(shard))));
    expect(await client.getGameHistory(257)).toBeNull();
  });

  it("caches views so back-to-back calls hit the network once", async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: `${BASE_PATH}v1/views/trending.json` })
      .reply(200, trendingView)
      .times(1);
    const first = await client.getTrendingView();
    const second = await client.getTrendingView();
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
  });
});
