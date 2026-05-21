import { GetGroupInputSchema, GetGroupOutputSchema } from "../../shared/schemas.js";
import type { ToolDefinition } from "./types.js";

/**
 * Creator / community tool: group metadata lookup.
 */
export const getGroup: ToolDefinition<typeof GetGroupInputSchema, typeof GetGroupOutputSchema> = {
  name: "get_group",
  description: [
    "Look up a Roblox group by `groupId` and return its metadata: `name`,",
    "`description`, `owner` (or null), `memberCount`, public-entry flag,",
    "Builders Club flag, and the latest pinned shout if any. Backed by",
    "`groups.roblox.com/v1/groups/{id}`.",
    "",
    "Groups are how many Roblox studios publish games — when a game's",
    "`creator.type` is 'Group', use this tool to get the studio's profile.",
    "For user-style creators use `get_creator`. Throws ROBLOX_NOT_FOUND",
    "if the group id is unknown or the group has been deleted.",
  ].join(" "),
  inputSchema: GetGroupInputSchema,
  outputSchema: GetGroupOutputSchema,
  handler: async (input, ctx) => {
    const group = await ctx.client.getGroup(input.groupId);
    return { group };
  },
};
