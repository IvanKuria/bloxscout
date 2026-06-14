import { BloxscoutCache } from "@bloxscout/core/cache";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { MockAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function makeClient() {
  const agent = new MockAgent();
  agent.disableNetConnect();
  const client = new RobloxClient({
    cache: new BloxscoutCache(),
    dispatcher: agent,
    sleep: async () => {},
  });
  return { client, agent };
}

describe("RobloxClient.getExploreSorts", () => {
  let agent: MockAgent;
  let client: RobloxClient;

  beforeEach(() => {
    ({ client, agent } = makeClient());
  });

  afterEach(async () => {
    await agent.close();
  });

  it("returns Games-typed sorts and drops non-game sorts like Filters", async () => {
    agent
      .get("https://apis.roblox.com")
      .intercept({ path: (p) => p.startsWith("/explore-api/v1/get-sorts") })
      .reply(200, {
        sorts: [
          { contentType: "Filters", sortId: "filters", filters: [] },
          {
            contentType: "Games",
            sortId: "top-trending",
            sortDisplayName: "Top Trending",
            games: [
              {
                universeId: 42,
                rootPlaceId: 420,
                name: "Tower Heroes",
                playerCount: 12000,
                totalUpVotes: 100,
                totalDownVotes: 5,
                isSponsored: false,
              },
            ],
          },
        ],
      });

    const sorts = await client.getExploreSorts({ device: "computer", country: "all" });
    expect(sorts).toHaveLength(1);
    expect(sorts[0]?.sortId).toBe("top-trending");
    expect(sorts[0]?.games[0]?.universeId).toBe(42);
    expect(sorts[0]?.games[0]?.playerCount).toBe(12000);
  });

  it("sends device and country as query params", async () => {
    let capturedPath = "";
    agent
      .get("https://apis.roblox.com")
      .intercept({
        path: (p) => {
          capturedPath = p;
          return p.startsWith("/explore-api/v1/get-sorts");
        },
      })
      .reply(200, { sorts: [] });

    await client.getExploreSorts({ device: "high_end_phone", country: "br" });
    expect(capturedPath).toContain("device=high_end_phone");
    expect(capturedPath).toContain("country=br");
    expect(capturedPath).toContain("sessionId=");
  });
});
