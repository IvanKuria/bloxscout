import { RobloxApiError } from "@bloxscout/core/errors";
import { describe, expect, it } from "vitest";
import { searchGames } from "../../../src/mcp/tools/search-games.js";
import { makeCtx } from "./_helpers.js";

describe("search_games tool", () => {
  it("parses input and forwards keyword + limit to the client", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockResolvedValue([
      {
        universeId: 1,
        rootPlaceId: 10,
        name: "A",
        description: "",
        playerCount: 5,
        totalUpVotes: 0,
        totalDownVotes: 0,
        creatorId: 1,
        creatorName: "x",
        creatorHasVerifiedBadge: false,
        contentId: 1,
        contentType: "Game",
      },
    ]);
    const input = searchGames.inputSchema.parse({ keyword: "obby", limit: 5 });
    const out = await searchGames.handler(input, ctx);
    expect(client.searchGames).toHaveBeenCalledWith("obby", { limit: 5 });
    expect(out.results).toHaveLength(1);
    expect(out.results[0]?.universeId).toBe(1);
  });

  it("defaults limit to 25 when omitted", () => {
    const parsed = searchGames.inputSchema.parse({ keyword: "x" });
    expect(parsed.limit).toBe(25);
  });

  it("rejects empty keyword at the schema layer", () => {
    expect(() => searchGames.inputSchema.parse({ keyword: "" })).toThrow();
  });

  it("propagates client errors so the server can map them", async () => {
    const { ctx, client } = makeCtx();
    client.searchGames.mockRejectedValue(
      new RobloxApiError("boom", { statusCode: 500, endpoint: "x" }),
    );
    await expect(searchGames.handler({ keyword: "x", limit: 5 }, ctx)).rejects.toBeInstanceOf(
      RobloxApiError,
    );
  });
});
