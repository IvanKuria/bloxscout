import { describe, expect, it } from "vitest";
import { getGamePlayerCount } from "../../../src/mcp/tools/get-game-player-count.js";
import { RobloxNotFoundError } from "../../../src/shared/errors.js";
import { makeCtx } from "./_helpers.js";

describe("get_game_player_count tool", () => {
  it("returns the first projection from the client", async () => {
    const { ctx, client } = makeCtx();
    client.getPlayerCounts.mockResolvedValue([{ universeId: 7, playing: 1234, visits: 5_000_000 }]);
    const out = await getGamePlayerCount.handler({ universeId: 7 }, ctx);
    expect(client.getPlayerCounts).toHaveBeenCalledWith([7]);
    expect(out).toEqual({ universeId: 7, playing: 1234, visits: 5_000_000 });
  });

  it("throws RobloxNotFoundError on empty result", async () => {
    const { ctx, client } = makeCtx();
    client.getPlayerCounts.mockResolvedValue([]);
    await expect(getGamePlayerCount.handler({ universeId: 99 }, ctx)).rejects.toBeInstanceOf(
      RobloxNotFoundError,
    );
  });
});
