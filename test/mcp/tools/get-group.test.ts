import { describe, expect, it } from "vitest";
import { getGroup } from "../../../src/mcp/tools/get-group.js";
import { RobloxNotFoundError } from "../../../src/shared/errors.js";
import { makeCtx } from "./_helpers.js";

describe("get_group tool", () => {
  const group = {
    id: 7,
    name: "Roblox",
    description: "",
    owner: { hasVerifiedBadge: false, userId: 1, username: "Games", displayName: "Games" },
    shout: null,
    memberCount: 1,
    isBuildersClubOnly: false,
    publicEntryAllowed: true,
    hasVerifiedBadge: true,
  };

  it("forwards groupId and wraps in { group }", async () => {
    const { ctx, client } = makeCtx();
    client.getGroup.mockResolvedValue(group);
    const out = await getGroup.handler({ groupId: 7 }, ctx);
    expect(client.getGroup).toHaveBeenCalledWith(7);
    expect(out.group.id).toBe(7);
  });

  it("propagates RobloxNotFoundError so the server maps it", async () => {
    const { ctx, client } = makeCtx();
    client.getGroup.mockRejectedValue(
      new RobloxNotFoundError("nope", { endpoint: "/v1/groups/999" }),
    );
    await expect(getGroup.handler({ groupId: 999 }, ctx)).rejects.toBeInstanceOf(
      RobloxNotFoundError,
    );
  });
});
