import { describe, expect, it } from "vitest";
import { getTopByGenre } from "../../../src/mcp/tools/get-top-by-genre.js";
import { BloxscoutError } from "../../../src/shared/errors.js";
import { gameFixture, makeCtx } from "./_helpers.js";

describe("get_top_by_genre tool", () => {
  it("ranks by `playing` by default and trims to limit", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([
      gameFixture(1, { playing: 50 }),
      gameFixture(2, { playing: 500 }),
      gameFixture(3, { playing: 100 }),
    ]);
    const input = getTopByGenre.inputSchema.parse({ genre: "simulator", limit: 2 });
    const out = await getTopByGenre.handler(input, ctx);
    expect(out.games.map((g) => g.id)).toEqual([2, 3]);
  });

  it("ranks by `visits` when requested", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([
      gameFixture(1, { visits: 10 }),
      gameFixture(2, { visits: 50 }),
    ]);
    const input = getTopByGenre.inputSchema.parse({
      genre: "simulator",
      rankBy: "visits",
      limit: 5,
    });
    const out = await getTopByGenre.handler(input, ctx);
    expect(out.games[0]?.id).toBe(2);
  });

  it("resolves alias `rpg` to role-playing", async () => {
    const { ctx, client } = makeCtx();
    client.getGames.mockResolvedValue([gameFixture(1, { playing: 1 })]);
    const input = getTopByGenre.inputSchema.parse({ genre: "rpg" });
    await getTopByGenre.handler(input, ctx);
    expect(client.getGames).toHaveBeenCalled();
  });

  it("throws VALIDATION_ERROR on an unknown genre", async () => {
    const { ctx } = makeCtx();
    const input = getTopByGenre.inputSchema.parse({ genre: "bogus-genre-zzz" });
    await expect(getTopByGenre.handler(input, ctx)).rejects.toBeInstanceOf(BloxscoutError);
  });
});
