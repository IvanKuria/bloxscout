/**
 * Domain types for Bloxscout, derived from real responses of Roblox's public
 * unauthenticated endpoints. Optional fields are marked `?`. Fields are kept
 * as the Roblox API returns them (camelCase, ISO 8601 strings for dates) to
 * keep the transport layer as thin as possible — Phase 2/3 formatters can
 * reshape for human display.
 */

export type RobloxUniverseId = number;
export type RobloxPlaceId = number;
export type RobloxUserId = number;
export type RobloxGroupId = number;

/**
 * Result of a single game in `apis.roblox.com/search-api/omni-search`.
 *
 * Verified shape (2026-05) for `GET https://apis.roblox.com/search-api/omni-search?searchQuery=...&pageType=all&sessionId=...`:
 * top-level `{ searchResults: [{ contentGroupType: "Game", contents: GameSummary[] }, ...] }`.
 * Each content has at minimum the keys listed below.
 */
export interface GameSummary {
  universeId: RobloxUniverseId;
  rootPlaceId: RobloxPlaceId;
  name: string;
  description: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
  creatorId: number;
  creatorName: string;
  creatorHasVerifiedBadge: boolean;
  contentId: number;
  contentType: string;
  contentMaturity?: string;
  minimumAge?: number;
  ageRecommendationDisplayName?: string;
  canonicalUrlPath?: string;
  emphasis?: boolean;
  isSponsored?: boolean;
}

/**
 * Creator embedded in game detail responses from `games.roblox.com/v1/games`.
 */
export interface GameCreatorRef {
  id: number;
  name: string;
  type: "User" | "Group";
  isRNVAccount: boolean;
  hasVerifiedBadge: boolean;
}

/**
 * Full game detail.
 *
 * Verified shape (2026-05) for `GET https://games.roblox.com/v1/games?universeIds=...`:
 * `{ data: Game[] }`. Includes live CCU (`playing`), `visits`, `favoritedCount`,
 * created/updated timestamps, genre fields, and the canonical URL path.
 */
export interface Game {
  id: RobloxUniverseId;
  rootPlaceId: RobloxPlaceId;
  name: string;
  description: string | null;
  sourceName: string | null;
  sourceDescription: string | null;
  creator: GameCreatorRef;
  price: number | null;
  allowedGearGenres: string[];
  allowedGearCategories: string[];
  isGenreEnforced: boolean;
  copyingAllowed: boolean;
  playing: number;
  visits: number;
  maxPlayers: number;
  created: string;
  updated: string;
  studioAccessToApisAllowed: boolean;
  createVipServersAllowed: boolean;
  universeAvatarType: string;
  genre: string;
  genre_l1: string;
  genre_l2: string;
  untranslated_genre_l1?: string;
  isAllGenre: boolean;
  isFavoritedByUser: boolean;
  favoritedCount: number;
  canonicalUrlPath?: string;
}

/** Live-presence projection over `Game`. */
export interface GamePlayerCount {
  universeId: RobloxUniverseId;
  playing: number;
  visits: number;
}

/**
 * Up/down vote totals for a game.
 *
 * Verified shape for `GET https://games.roblox.com/v1/games/votes?universeIds=...`
 * — `{ data: [{ id, upVotes, downVotes }] }` where `id` is the universe id. The
 * like-ratio (`upVotes / (upVotes + downVotes)`) is the cheapest quality signal
 * Roblox exposes unauthenticated.
 */
export interface GameVotes {
  universeId: RobloxUniverseId;
  upVotes: number;
  downVotes: number;
}

/**
 * User profile.
 *
 * Verified shape (2026-05) for `GET https://users.roblox.com/v1/users/{userId}`.
 */
export interface User {
  id: RobloxUserId;
  name: string;
  displayName: string;
  description: string;
  created: string;
  isBanned: boolean;
  externalAppDisplayName: string | null;
  hasVerifiedBadge: boolean;
}

/** Alias — a creator looked up via `getCreator` is a `User`. Groups have a separate endpoint. */
export type Creator = User;

/**
 * Group owner reference embedded in group details.
 */
export interface GroupOwner {
  hasVerifiedBadge: boolean;
  userId: RobloxUserId;
  username: string;
  displayName: string;
}

/**
 * Group details.
 *
 * Verified shape (2026-05) for `GET https://groups.roblox.com/v1/groups/{groupId}`.
 */
export interface Group {
  id: RobloxGroupId;
  name: string;
  description: string;
  owner: GroupOwner | null;
  shout: unknown | null;
  memberCount: number;
  isBuildersClubOnly: boolean;
  publicEntryAllowed: boolean;
  hasVerifiedBadge: boolean;
  hasSocialModules?: boolean;
}

/**
 * Game icon / thumbnail result.
 *
 * Verified shape (2026-05) for `GET https://thumbnails.roblox.com/v1/games/icons?universeIds=...&size=...&format=Png&isCircular=false`:
 * `{ data: GameIcon[] }`.
 */
export interface GameIcon {
  targetId: RobloxUniverseId;
  state: "Completed" | "Pending" | "Blocked" | "Error" | "TemporarilyUnavailable" | (string & {});
  imageUrl: string | null;
  version?: string;
}

/** Supported icon sizes for `getGameIcons`. */
export type GameIconSize = "512x512" | "256x256" | "150x150" | "128x128" | "100x100" | "50x50";

/**
 * A monetization game pass for a universe.
 *
 * Normalized from Roblox's game-passes listing. `price` is in Robux and is
 * `null` for passes that are off-sale / unpriced. Source endpoint shape is
 * documented on `RobloxClient.getGamePasses`.
 */
export interface GamePass {
  id: number;
  name: string;
  /** Price in Robux, or `null` when off-sale / not for sale. */
  price: number | null;
}

/**
 * Game published by a user, returned by `games.roblox.com/v2/users/{userId}/games`.
 */
export interface CreatorGame {
  id: RobloxUniverseId;
  name: string;
  description: string | null;
  creator: { id: number; type: "User" | "Group" };
  rootPlace: { id: RobloxPlaceId; type: "Place" };
  created: string;
  updated: string;
  placeVisits: number;
}
