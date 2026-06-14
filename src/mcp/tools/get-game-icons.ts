import { GameIconSchema } from "@bloxscout/core/schemas";
import { z } from "zod";
import type { ToolDefinition } from "./types.js";

const GameIconSizeSchema = z.enum(["512x512", "256x256", "150x150", "128x128", "100x100", "50x50"]);

export const GetGameIconsInputSchema = z.object({
  universeIds: z.array(z.number().int().positive()).min(1).max(100),
  size: GameIconSizeSchema.default("512x512"),
});

export const GetGameIconsOutputSchema = z.object({
  icons: z.array(GameIconSchema),
});

/**
 * Creator / community tool: thumbnails (game icons) for a batch of universe
 * ids.
 */
export const getGameIcons: ToolDefinition<
  typeof GetGameIconsInputSchema,
  typeof GetGameIconsOutputSchema
> = {
  name: "get_game_icons",
  description: [
    "Fetch the icon (square thumbnail) URL for up to 100 games in one call,",
    "at a chosen size (default 512x512 PNG). Returns an array of",
    "`{ targetId, state, imageUrl, version? }` records; `state` indicates",
    "whether the icon is `Completed`, `Pending`, `Blocked`, etc. — only",
    "`Completed` icons have a non-null `imageUrl`. Backed by",
    "`thumbnails.roblox.com/v1/games/icons`.",
    "",
    "Use this to enrich a results list (search, trending, compare) with",
    "renderable image URLs, or to verify that a game has a thumbnail set",
    "at all. The Roblox API caps each call at ~100 ids; passing more will",
    "be rejected by the schema.",
  ].join(" "),
  inputSchema: GetGameIconsInputSchema,
  outputSchema: GetGameIconsOutputSchema,
  handler: async (input, ctx) => {
    const icons = await ctx.client.getGameIcons(input.universeIds, input.size);
    return { icons };
  },
};
