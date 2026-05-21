import { GetCreatorInputSchema, GetCreatorOutputSchema } from "../../shared/schemas.js";
import type { ToolDefinition } from "./types.js";

/**
 * Creator / community tool: user-style creator lookup.
 */
export const getCreator: ToolDefinition<
  typeof GetCreatorInputSchema,
  typeof GetCreatorOutputSchema
> = {
  name: "get_creator",
  description: [
    "Look up a Roblox user (treated here as a 'creator') by `userId` and",
    "return profile fields: `name`, `displayName`, `description`, account",
    "`created` date, ban status, and verified-badge flag. Backed by",
    "`users.roblox.com/v1/users/{id}`.",
    "",
    "Use this when the user gives a numeric Roblox user id and wants the",
    "profile. For groups (Roblox's other kind of game owner) use",
    "`get_group` instead. Throws ROBLOX_NOT_FOUND if the user id does",
    "not exist.",
  ].join(" "),
  inputSchema: GetCreatorInputSchema,
  outputSchema: GetCreatorOutputSchema,
  handler: async (input, ctx) => {
    const user = await ctx.client.getCreator(input.userId);
    return { user };
  },
};
