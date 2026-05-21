/**
 * MCP tool: `get_top_creators_by_genre`.
 *
 * v0.1 (seed-based) wrapper around `getTopCreatorsByGenre` from
 * `src/core/top-creators.ts`. Requires a `RobloxClient` to fetch live CCU
 * for the curated per-genre seed games.
 */

import { SUPPORTED_SEED_GENRES } from "../../core/seed-data.js";
import { getTopCreatorsByGenre } from "../../core/top-creators.js";
import {
  type GetTopCreatorsByGenreInput,
  GetTopCreatorsByGenreInputSchema,
  type GetTopCreatorsByGenreOutput,
  GetTopCreatorsByGenreOutputSchema,
} from "../../shared/schemas.js";
import type { ToolContext, ToolDefinition } from "./types.js";

const TOOL_NAME = "get_top_creators_by_genre";

const TOOL_DESCRIPTION = [
  "Identify the most successful Roblox creators within a specific genre.",
  "",
  "Returns up to `limit` creators (default 10), ranked by the sum of live concurrent",
  "players (CCU) across their games that appear in a curated seed list for the genre.",
  "Each entry includes the creator id, creator type (User or Group), display name,",
  "summed CCU, game count, and the creator's most-played seed-list game.",
  "",
  `Supported genres (case-insensitive): ${SUPPORTED_SEED_GENRES.join(", ")}.`,
  "Unknown genres raise a VALIDATION_ERROR with the supported list.",
  "",
  "v0.1 implementation note: Roblox does not expose a public 'top creators by genre'",
  "endpoint, so this tool ranks against a curated 10-20 game seed list per genre.",
  "v0.2 (after the snapshot store ships) will switch to a real-time leaderboard",
  "computed from local snapshots, without changing this tool's input or output shape.",
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
