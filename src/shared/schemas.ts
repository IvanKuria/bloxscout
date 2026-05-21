import { z } from "zod";

/**
 * Zod schemas for every Bloxscout MCP tool that ships in Phases 1-3. The
 * schemas are the single source of truth: Phase 2 turns the input schemas
 * into JSON Schema via `zod-to-json-schema` for `tools/list`, and Phase 3's
 * CLI uses them to validate flag-parsed arguments.
 *
 * Output schemas double as a runtime contract for the integration tests:
 * if Roblox changes a payload shape, the integration suite fails fast.
 *
 * Naming convention: `<ToolName>Input` / `<ToolName>Output`. Each value is
 * also re-exported as a TypeScript type with the same name so consumers can
 * `import type { SearchGamesInput } from "../shared/schemas.js"`.
 */

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const UniverseIdSchema = z.number().int().positive();
const UserIdSchema = z.number().int().positive();
const GroupIdSchema = z.number().int().positive();

export const GameSummarySchema = z.object({
  universeId: UniverseIdSchema,
  rootPlaceId: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  playerCount: z.number().int().nonnegative(),
  totalUpVotes: z.number().int().nonnegative(),
  totalDownVotes: z.number().int().nonnegative(),
  creatorId: z.number().int().nonnegative(),
  creatorName: z.string(),
  creatorHasVerifiedBadge: z.boolean(),
  contentId: z.number().int().nonnegative(),
  contentType: z.string(),
  contentMaturity: z.string().optional(),
  minimumAge: z.number().int().nonnegative().optional(),
  ageRecommendationDisplayName: z.string().optional(),
  canonicalUrlPath: z.string().optional(),
  emphasis: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
});

export const GameCreatorRefSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  type: z.enum(["User", "Group"]),
  isRNVAccount: z.boolean(),
  hasVerifiedBadge: z.boolean(),
});

export const GameSchema = z.object({
  id: UniverseIdSchema,
  rootPlaceId: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  sourceName: z.string().nullable(),
  sourceDescription: z.string().nullable(),
  creator: GameCreatorRefSchema,
  price: z.number().nullable(),
  allowedGearGenres: z.array(z.string()),
  allowedGearCategories: z.array(z.string()),
  isGenreEnforced: z.boolean(),
  copyingAllowed: z.boolean(),
  playing: z.number().int().nonnegative(),
  visits: z.number().int().nonnegative(),
  maxPlayers: z.number().int().positive(),
  created: z.string(),
  updated: z.string(),
  studioAccessToApisAllowed: z.boolean(),
  createVipServersAllowed: z.boolean(),
  universeAvatarType: z.string(),
  genre: z.string(),
  genre_l1: z.string(),
  genre_l2: z.string(),
  untranslated_genre_l1: z.string().optional(),
  isAllGenre: z.boolean(),
  isFavoritedByUser: z.boolean(),
  favoritedCount: z.number().int().nonnegative(),
  canonicalUrlPath: z.string().optional(),
});

export const UserSchema = z.object({
  id: UserIdSchema,
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  created: z.string(),
  isBanned: z.boolean(),
  externalAppDisplayName: z.string().nullable(),
  hasVerifiedBadge: z.boolean(),
});

export const GroupSchema = z.object({
  id: GroupIdSchema,
  name: z.string(),
  description: z.string(),
  owner: z
    .object({
      hasVerifiedBadge: z.boolean(),
      userId: UserIdSchema,
      username: z.string(),
      displayName: z.string(),
    })
    .nullable(),
  shout: z.unknown().nullable(),
  memberCount: z.number().int().nonnegative(),
  isBuildersClubOnly: z.boolean(),
  publicEntryAllowed: z.boolean(),
  hasVerifiedBadge: z.boolean(),
  hasSocialModules: z.boolean().optional(),
});

export const GameIconSchema = z.object({
  targetId: UniverseIdSchema,
  state: z.string(),
  imageUrl: z.string().nullable(),
  version: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Discovery tools
// ---------------------------------------------------------------------------

export const SearchGamesInputSchema = z.object({
  keyword: z.string().min(1).max(200),
  limit: z.number().int().positive().max(100).default(25),
});
export type SearchGamesInput = z.infer<typeof SearchGamesInputSchema>;

export const SearchGamesOutputSchema = z.object({
  results: z.array(GameSummarySchema),
});
export type SearchGamesOutput = z.infer<typeof SearchGamesOutputSchema>;

export const GetTrendingGamesInputSchema = z.object({
  genre: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).default(20),
});
export type GetTrendingGamesInput = z.infer<typeof GetTrendingGamesInputSchema>;

export const GetTrendingGamesOutputSchema = z.object({
  games: z.array(GameSchema),
});
export type GetTrendingGamesOutput = z.infer<typeof GetTrendingGamesOutputSchema>;

export const GetTopByGenreInputSchema = z.object({
  genre: z.string().min(1),
  rankBy: z.enum(["playing", "visits", "favoritedCount"]).default("playing"),
  limit: z.number().int().positive().max(100).default(20),
});
export type GetTopByGenreInput = z.infer<typeof GetTopByGenreInputSchema>;

export const GetTopByGenreOutputSchema = z.object({
  games: z.array(GameSchema),
});
export type GetTopByGenreOutput = z.infer<typeof GetTopByGenreOutputSchema>;

// ---------------------------------------------------------------------------
// Game intelligence tools
// ---------------------------------------------------------------------------

export const GetGameInputSchema = z.object({
  universeId: UniverseIdSchema,
});
export type GetGameInput = z.infer<typeof GetGameInputSchema>;

export const GetGameOutputSchema = z.object({
  game: GameSchema,
});
export type GetGameOutput = z.infer<typeof GetGameOutputSchema>;

export const GetGamePlayerCountInputSchema = z.object({
  universeId: UniverseIdSchema,
});
export type GetGamePlayerCountInput = z.infer<typeof GetGamePlayerCountInputSchema>;

export const GetGamePlayerCountOutputSchema = z.object({
  universeId: UniverseIdSchema,
  playing: z.number().int().nonnegative(),
  visits: z.number().int().nonnegative(),
});
export type GetGamePlayerCountOutput = z.infer<typeof GetGamePlayerCountOutputSchema>;

export const CompareGamesInputSchema = z.object({
  universeIds: z.array(UniverseIdSchema).min(2).max(10),
});
export type CompareGamesInput = z.infer<typeof CompareGamesInputSchema>;

export const CompareGamesOutputSchema = z.object({
  games: z.array(GameSchema),
});
export type CompareGamesOutput = z.infer<typeof CompareGamesOutputSchema>;

// ---------------------------------------------------------------------------
// Creator / community tools
// ---------------------------------------------------------------------------

export const GetCreatorInputSchema = z.object({
  userId: UserIdSchema,
});
export type GetCreatorInput = z.infer<typeof GetCreatorInputSchema>;

export const GetCreatorOutputSchema = z.object({
  user: UserSchema,
});
export type GetCreatorOutput = z.infer<typeof GetCreatorOutputSchema>;

export const GetGroupInputSchema = z.object({
  groupId: GroupIdSchema,
});
export type GetGroupInput = z.infer<typeof GetGroupInputSchema>;

export const GetGroupOutputSchema = z.object({
  group: GroupSchema,
});
export type GetGroupOutput = z.infer<typeof GetGroupOutputSchema>;

// =============================================================================
// Phase 5a — calculators + top creators
// =============================================================================
//
// Schemas for `calculate_devex`, `estimate_game_revenue`, and
// `get_top_creators_by_genre`. Appended at the end of the file to minimize
// merge conflicts with Phase 2 (which also appends its tool schemas here).

export const CalculateDevexInputSchema = z.object({
  robux: z.number().nonnegative(),
  rateUsdPerRobux: z.number().positive().optional(),
});
export type CalculateDevexInput = z.infer<typeof CalculateDevexInputSchema>;

export const CalculateDevexOutputSchema = z.object({
  robux: z.number().nonnegative(),
  usd: z.number().nonnegative(),
  rateUsdPerRobux: z.number().positive(),
  payoutMinimumNotMet: z.boolean().optional(),
});
export type CalculateDevexOutput = z.infer<typeof CalculateDevexOutputSchema>;

export const EstimateGameRevenueInputSchema = z.object({
  playing: z.number().int().nonnegative(),
  visits: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1).optional(),
  averageRobuxPerPayingUser: z.number().nonnegative().optional(),
  daysActive: z.number().positive().optional(),
  rateUsdPerRobux: z.number().positive().optional(),
});
export type EstimateGameRevenueInput = z.infer<typeof EstimateGameRevenueInputSchema>;

export const EstimateGameRevenueOutputSchema = z.object({
  inputs: z.object({
    playing: z.number().int().nonnegative(),
    visits: z.number().int().nonnegative(),
    conversionRate: z.number().min(0).max(1),
    averageRobuxPerPayingUser: z.number().nonnegative(),
    daysActive: z.number().positive(),
    rateUsdPerRobux: z.number().positive(),
  }),
  estimatedDailyRobux: z.number().nonnegative(),
  estimatedMonthlyRobux: z.number().nonnegative(),
  estimatedMonthlyUsd: z.number().nonnegative(),
  confidence: z.enum(["low", "medium", "high"]),
  assumptions: z.array(z.string()),
  disclaimer: z.string(),
});
export type EstimateGameRevenueOutput = z.infer<typeof EstimateGameRevenueOutputSchema>;

export const GetTopCreatorsByGenreInputSchema = z.object({
  genre: z.string().min(1),
  limit: z.number().int().positive().max(100).default(10),
});
export type GetTopCreatorsByGenreInput = z.infer<typeof GetTopCreatorsByGenreInputSchema>;

export const TopCreatorEntrySchema = z.object({
  creatorId: z.number().int().nonnegative(),
  creatorType: z.enum(["User", "Group"]),
  creatorName: z.string(),
  totalPlayingAcrossSeedGames: z.number().int().nonnegative(),
  gameCount: z.number().int().nonnegative(),
  topGame: z.object({
    universeId: z.number().int().positive(),
    name: z.string(),
    playing: z.number().int().nonnegative(),
  }),
});
export type TopCreatorEntry = z.infer<typeof TopCreatorEntrySchema>;

export const GetTopCreatorsByGenreOutputSchema = z.object({
  genre: z.string(),
  creators: z.array(TopCreatorEntrySchema),
});
export type GetTopCreatorsByGenreOutput = z.infer<typeof GetTopCreatorsByGenreOutputSchema>;
