import { describe, expect, it } from "vitest";
import { getGameIcons } from "../../../src/mcp/tools/get-game-icons.js";
import { makeCtx } from "./_helpers.js";

describe("get_game_icons tool", () => {
  it("forwards ids + size and wraps in { icons }", async () => {
    const { ctx, client } = makeCtx();
    client.getGameIcons.mockResolvedValue([
      { targetId: 1, state: "Completed", imageUrl: "https://x" },
    ]);
    const input = getGameIcons.inputSchema.parse({ universeIds: [1, 2], size: "256x256" });
    const out = await getGameIcons.handler(input, ctx);
    expect(client.getGameIcons).toHaveBeenCalledWith([1, 2], "256x256");
    expect(out.icons).toHaveLength(1);
  });

  it("defaults size to 512x512", () => {
    const parsed = getGameIcons.inputSchema.parse({ universeIds: [1] });
    expect(parsed.size).toBe("512x512");
  });

  it("rejects empty universeIds array", () => {
    expect(() => getGameIcons.inputSchema.parse({ universeIds: [] })).toThrow();
  });

  it("rejects more than 100 ids", () => {
    expect(() =>
      getGameIcons.inputSchema.parse({
        universeIds: Array.from({ length: 101 }, (_, i) => i + 1),
      }),
    ).toThrow();
  });
});
