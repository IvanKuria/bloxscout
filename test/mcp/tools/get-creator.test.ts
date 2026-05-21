import { describe, expect, it } from "vitest";
import { getCreator } from "../../../src/mcp/tools/get-creator.js";
import { RobloxNotFoundError } from "../../../src/shared/errors.js";
import { makeCtx } from "./_helpers.js";

describe("get_creator tool", () => {
  const user = {
    id: 1,
    name: "Roblox",
    displayName: "Roblox",
    description: "",
    created: "2006-02-27T21:06:40.3Z",
    isBanned: false,
    externalAppDisplayName: null,
    hasVerifiedBadge: true,
  };

  it("forwards userId and wraps in { user }", async () => {
    const { ctx, client } = makeCtx();
    client.getCreator.mockResolvedValue(user);
    const out = await getCreator.handler({ userId: 1 }, ctx);
    expect(client.getCreator).toHaveBeenCalledWith(1);
    expect(out.user.name).toBe("Roblox");
  });

  it("propagates RobloxNotFoundError so the server maps it", async () => {
    const { ctx, client } = makeCtx();
    client.getCreator.mockRejectedValue(
      new RobloxNotFoundError("nope", { endpoint: "/v1/users/999" }),
    );
    await expect(getCreator.handler({ userId: 999 }, ctx)).rejects.toBeInstanceOf(
      RobloxNotFoundError,
    );
  });

  it("rejects non-positive userId", () => {
    expect(() => getCreator.inputSchema.parse({ userId: 0 })).toThrow();
  });
});
