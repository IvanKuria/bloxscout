/**
 * MCP tool: `get_top_creators_by_genre`.
 *
 * Thin wrapper around `getTopCreatorsByGenre` from
 * `src/core/top-creators.ts`. Requires a `RobloxClient` so the core can
 * resolve the genre's live top games via omni-search.
 */

import { getTopCreatorsByGenre } from "../../core/top-creators.js";
import {
  type GetTopCreatorsByGenreInput,
  GetTopCreatorsByGenreInputSchema,
  type GetTopCreatorsByGenreOutput,
  GetTopCreatorsByGenreOutputSchema,
} from "../../shared/schemas.js";
import { SUPPORTED_GENRES } from "../data/genre-seeds.js";
import type { ToolContext, ToolDefinition } from "./types.js";

const TOOL_NAME = "get_top_creators_by_genre";

const TOOL_DESCRIPTION = [
  "Identify the most successful Roblox creators within a specific genre.",
  "",
  "Returns up to `limit` creators (default 10), ranked by the sum of live concurrent",
  "players (CCU) across their games that appear in the live omni-search top results",
  "for the genre keyword. Each entry includes the creator id, creator type",
  "(User or Group), display name, summed CCU, game count, and the creator's",
  "most-played game from the result set.",
  "",
  `Supported genres (case-insensitive): ${SUPPORTED_GENRES.join(", ")}.`,
  "Unknown genres raise a VALIDATION_ERROR with the supported list.",
  "",
  "Implementation note: Roblox does not expose a public 'top creators by genre'",
  "endpoint, so this tool ranks against the live omni-search top results for the",
  "genre keyword. v0.2 (after the snapshot store ships) will switch to a real-time",
  "leaderboard computed from local snapshots, without changing this tool's input",
  "or output shape.",
].join("\n");

export async function getTopCreatorsByGenreHandler(
  input: GetTopCreatorsByGenreInput,
  ctx: ToolContext,
): Promise<GetTopCreatorsByGenreOutput> {
  const creators = await getTopCreatorsByGenre(ctx.client, input.genre, {
    limit: input.limit,
  });
  return GetTopCreatorsByGenreOutputSchema.parse({
    genre: input.genre,
    creators,
  });
}

export const getTopCreatorsByGenreInfo: ToolDefinition<
  typeof GetTopCreatorsByGenreInputSchema,
  typeof GetTopCreatorsByGenreOutputSchema
> = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  inputSchema: GetTopCreatorsByGenreInputSchema,
  outputSchema: GetTopCreatorsByGenreOutputSchema,
  handler: getTopCreatorsByGenreHandler,
};

/** @deprecated Legacy export retained for the get_top_creators_by_genre test suite. */
export const getTopCreatorsByGenreTool = getTopCreatorsByGenreInfo;
