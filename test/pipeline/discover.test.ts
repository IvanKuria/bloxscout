import { describe, expect, it } from "vitest";
import { discoverGames } from "../../pipeline/discover.js";
import type { ExploreSort } from "../../src/core/roblox-client.js";

function exploreSort(games: Array<[id: number, name: string]>): ExploreSort {
  return {
    sortId: "top-trending",
    sortDisplayName: "Top Trending",
    games: games.map(([universeId, name]) => ({
      universeId,
      rootPlaceId: universeId * 10,
      name,
      playerCount: 100,
      totalUpVotes: 1,
      totalDownVotes: 0,
      isSponsored: false,
    })),
  };
}

describe("discoverGames", () => {
  it("dedupes games across explore matrix combos", async () => {
    const client = {
      getExploreSorts: async () => [
        exploreSort([
          [1, "A"],
          [2, "B"],
        ]),
      ],
      searchGames: async () => [],
    };
    const found = await discoverGames(client, {
      matrix: { devices: ["computer", "console"], countries: ["all"] },
      omniSweep: false,
    });
    expect(found.map((g) => g.universeId).sort()).toEqual([1, 2]);
  });

  it("adds omni-search results when omniSweep is on", async () => {
    const client = {
      getExploreSorts: async () => [exploreSort([[1, "A"]])],
      searchGames: async (query: string) =>
        query === "tycoon" ? [{ universeId: 9, name: "T" } as never] : [],
    };
    const found = await discoverGames(client, {
      matrix: { devices: ["computer"], countries: ["all"] },
      omniSweep: true,
      omniQueries: ["tycoon", "obby"],
    });
    expect(found.map((g) => g.universeId).sort()).toEqual([1, 9]);
  });

  it("survives individual combo failures", async () => {
    let calls = 0;
    const client = {
      getExploreSorts: async () => {
        calls += 1;
        if (calls === 1) throw new Error("boom");
        return [exploreSort([[3, "C"]])];
      },
      searchGames: async () => [],
    };
    const found = await discoverGames(client, {
      matrix: { devices: ["computer"], countries: ["all", "us"] },
      omniSweep: false,
    });
    expect(found.map((g) => g.universeId)).toEqual([3]);
  });
});
