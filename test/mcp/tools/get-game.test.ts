import { RobloxNotFoundError } from "@bloxscout/core/errors";
import { describe, expect, it } from "vitest";
import { getGame } from "../../../src/mcp/tools/get-game.js";
import { gameFixture, makeCtx } from "./_helpers.js";

describe("get_game tool", () => {
  it("returns the first game from the client and wraps in { game }", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([gameFixture(123, { name: "Hello" })]);
    const out = await getGame.handler({ universeId: 123 }, ctx);
    expect(client.getGames).toHaveBeenCalledWith([123]);
    expect(out.game.id).toBe(123);
    expect(out.game.name).toBe("Hello");
  });

  it("throws RobloxNotFoundError when client returns empty", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([]);
    await expect(getGame.handler({ universeId: 999 }, ctx)).rejects.toBeInstanceOf(
      RobloxNotFoundError,
    );
  });

  it("rejects non-positive universe ids at the schema layer", () => {
    expect(() => getGame.inputSchema.parse({ universeId: 0 })).toThrow();
    expect(() => getGame.inputSchema.parse({ universeId: -1 })).toThrow();
  });
});
