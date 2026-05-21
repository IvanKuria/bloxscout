import { describe, expect, it } from "vitest";
import {
  CompareGamesInputSchema,
  GameSchema,
  GameSummarySchema,
  GetCreatorInputSchema,
  GetGameInputSchema,
  GetGamePlayerCountOutputSchema,
  GetGroupInputSchema,
  GetTopByGenreInputSchema,
  GetTrendingGamesInputSchema,
  GroupSchema,
  SearchGamesInputSchema,
  SearchGamesOutputSchema,
  UserSchema,
} from "../../src/shared/schemas.js";

describe("schemas — discovery", () => {
  it("SearchGamesInput accepts valid input and defaults limit", () => {
    const parsed = SearchGamesInputSchema.parse({ keyword: "tycoon" });
    expect(parsed.limit).toBe(25);
  });

  it("SearchGamesInput rejects empty keyword", () => {
    expect(() => SearchGamesInputSchema.parse({ keyword: "" })).toThrow();
  });

  it("SearchGamesInput rejects out-of-range limit", () => {
    expect(() => SearchGamesInputSchema.parse({ keyword: "x", limit: 999 })).toThrow();
  });

  it("SearchGamesOutput parses a realistic result", () => {
    const sample = {
      results: [
        {
          universeId: 3754482795,
          rootPlaceId: 10253248401,
          name: "Elemental Powers Tycoon",
          description: "",
          playerCount: 3845,
          totalUpVotes: 335407,
          totalDownVotes: 41582,
          creatorId: 0,
          creatorName: "",
          creatorHasVerifiedBadge: false,
          contentId: 3754482795,
          contentType: "Game",
          minimumAge: 5,
          ageRecommendationDisplayName: "Maturity: Mild",
          contentMaturity: "mild",
          canonicalUrlPath: "/games/10253248401/Elemental-Powers-Tycoon",
          emphasis: false,
          isSponsored: false,
        },
      ],
    };
    const parsed = SearchGamesOutputSchema.parse(sample);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0]?.universeId).toBe(3754482795);
  });

  it("GetTrendingGamesInput defaults limit to 20", () => {
    const parsed = GetTrendingGamesInputSchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.genre).toBeUndefined();
  });

  it("GetTopByGenreInput requires genre", () => {
    expect(() => GetTopByGenreInputSchema.parse({})).toThrow();
    const parsed = GetTopByGenreInputSchema.parse({ genre: "Simulator" });
    expect(parsed.rankBy).toBe("playing");
  });
});

describe("schemas — game intelligence", () => {
  it("GameSchema accepts a real /v1/games entry", () => {
    const sample = {
      id: 994732206,
      rootPlaceId: 2753915549,
      name: "Blox Fruits",
      description: "Welcome to Blox Fruits!",
      sourceName: null,
      sourceDescription: null,
      creator: {
        id: 4372130,
        name: "Gamer Robot Inc",
        type: "Group",
        isRNVAccount: false,
        hasVerifiedBadge: true,
      },
      price: null,
      allowedGearGenres: ["Adventure"],
      allowedGearCategories: [],
      isGenreEnforced: true,
      copyingAllowed: false,
      playing: 249940,
      visits: 61551583458,
      maxPlayers: 12,
      created: "2019-01-16T03:29:19.433Z",
      updated: "2026-05-18T04:24:53.603Z",
      studioAccessToApisAllowed: false,
      createVipServersAllowed: false,
      universeAvatarType: "MorphToR15",
      genre: "Adventure",
      genre_l1: "RPG",
      genre_l2: "Action RPG",
      untranslated_genre_l1: "rpg",
      isAllGenre: false,
      isFavoritedByUser: false,
      favoritedCount: 18872053,
      canonicalUrlPath: "/games/2753915549/Blox-Fruits",
    };
    const parsed = GameSchema.parse(sample);
    expect(parsed.creator.type).toBe("Group");
    expect(parsed.playing).toBe(249940);
  });

  it("GameSchema rejects missing required fields", () => {
    expect(() => GameSchema.parse({ id: 1, name: "x" })).toThrow();
  });

  it("GameSummarySchema rejects negative playerCount", () => {
    expect(() =>
      GameSummarySchema.parse({
        universeId: 1,
        rootPlaceId: 1,
        name: "x",
        description: "",
        playerCount: -1,
        totalUpVotes: 0,
        totalDownVotes: 0,
        creatorId: 0,
        creatorName: "",
        creatorHasVerifiedBadge: false,
        contentId: 1,
        contentType: "Game",
      }),
    ).toThrow();
  });

  it("GetGameInput requires universeId", () => {
    expect(() => GetGameInputSchema.parse({})).toThrow();
    expect(GetGameInputSchema.parse({ universeId: 12345 }).universeId).toBe(12345);
  });

  it("GetGamePlayerCountOutput accepts presence projection", () => {
    const parsed = GetGamePlayerCountOutputSchema.parse({
      universeId: 12345,
      playing: 0,
      visits: 999,
    });
    expect(parsed.playing).toBe(0);
  });

  it("CompareGamesInput requires at least 2 ids", () => {
    expect(() => CompareGamesInputSchema.parse({ universeIds: [1] })).toThrow();
    const ok = CompareGamesInputSchema.parse({ universeIds: [1, 2, 3] });
    expect(ok.universeIds).toHaveLength(3);
  });
});

describe("schemas — creator/community", () => {
  it("UserSchema parses a real /v1/users response", () => {
    const sample = {
      description: "the Roblox account",
      created: "2006-02-27T21:06:40.3Z",
      isBanned: false,
      externalAppDisplayName: null,
      hasVerifiedBadge: true,
      id: 1,
      name: "Roblox",
      displayName: "Roblox",
    };
    const parsed = UserSchema.parse(sample);
    expect(parsed.name).toBe("Roblox");
  });

  it("UserSchema rejects non-positive userId", () => {
    expect(() =>
      UserSchema.parse({
        id: 0,
        name: "x",
        displayName: "x",
        description: "",
        created: "now",
        isBanned: false,
        externalAppDisplayName: null,
        hasVerifiedBadge: false,
      }),
    ).toThrow();
  });

  it("GetCreatorInput requires userId", () => {
    expect(() => GetCreatorInputSchema.parse({})).toThrow();
  });

  it("GroupSchema parses a real /v1/groups response", () => {
    const sample = {
      id: 7,
      name: "Roblox",
      description: "Official fan club of Roblox!",
      owner: {
        hasVerifiedBadge: false,
        userId: 21557,
        username: "Games",
        displayName: "Games",
      },
      shout: null,
      memberCount: 13431109,
      isBuildersClubOnly: false,
      publicEntryAllowed: true,
      hasVerifiedBadge: true,
      hasSocialModules: true,
    };
    const parsed = GroupSchema.parse(sample);
    expect(parsed.owner?.userId).toBe(21557);
  });

  it("GetGroupInput rejects negative groupId", () => {
    expect(() => GetGroupInputSchema.parse({ groupId: -5 })).toThrow();
  });
});
