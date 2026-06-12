import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/index.js";
import type { RobloxClient } from "../../src/core/roblox-client.js";
import type {
  CreatorGame,
  Game,
  GameIcon,
  GameSummary,
  Group,
  User,
} from "../../src/core/types.js";
import { BloxscoutError, RobloxNotFoundError } from "../../src/shared/errors.js";

/**
 * Build a `RobloxClient`-shaped stub. `runCli` exposes a `clientFactory`
 * injection point, so we don't need to `vi.mock` the core module — we just
 * hand it the stub directly. This keeps tests fast and free of module-graph
 * weirdness.
 */
type ClientStub = {
  [K in keyof RobloxClient]?: RobloxClient[K];
};

function makeRunner(stub: ClientStub) {
  const exit = vi.fn();
  return async (argv: string[]) => {
    await runCli(["node", "bloxscout", ...argv], {
      clientFactory: () => stub as unknown as RobloxClient,
      hostedFactory: () => undefined,
      exit: exit as unknown as (code: number) => void,
    });
    return exit;
  };
}

const SAMPLE_SUMMARY: GameSummary = {
  universeId: 11,
  rootPlaceId: 22,
  name: "Sample Game",
  description: "desc",
  playerCount: 1234,
  totalUpVotes: 10,
  totalDownVotes: 1,
  creatorId: 99,
  creatorName: "Sample Studio",
  creatorHasVerifiedBadge: false,
  contentId: 0,
  contentType: "Game",
};

const SAMPLE_GAME: Game = {
  id: 11,
  rootPlaceId: 22,
  name: "Sample Game",
  description: "desc",
  sourceName: "Sample Game",
  sourceDescription: "desc",
  creator: {
    id: 99,
    name: "Sample Studio",
    type: "Group",
    isRNVAccount: false,
    hasVerifiedBadge: false,
  },
  price: null,
  allowedGearGenres: [],
  allowedGearCategories: [],
  isGenreEnforced: false,
  copyingAllowed: false,
  playing: 1234,
  visits: 50_000_000,
  maxPlayers: 30,
  created: "2020-01-01T00:00:00Z",
  updated: "2026-05-01T00:00:00Z",
  studioAccessToApisAllowed: false,
  createVipServersAllowed: false,
  universeAvatarType: "MorphToR15",
  genre: "Adventure",
  genre_l1: "Adventure",
  genre_l2: "OpenWorld",
  isAllGenre: false,
  isFavoritedByUser: false,
  favoritedCount: 4242,
};

const SAMPLE_USER: User = {
  id: 1,
  name: "ada",
  displayName: "Ada Lovelace",
  description: "a bio",
  created: "2010-01-01T00:00:00Z",
  isBanned: false,
  externalAppDisplayName: null,
  hasVerifiedBadge: true,
};

const SAMPLE_GROUP: Group = {
  id: 7,
  name: "Builders",
  description: "we build",
  owner: { hasVerifiedBadge: false, userId: 1, username: "ada", displayName: "Ada Lovelace" },
  shout: null,
  memberCount: 4321,
  isBuildersClubOnly: false,
  publicEntryAllowed: true,
  hasVerifiedBadge: false,
};

const SAMPLE_ICON: GameIcon = {
  targetId: 11,
  state: "Completed",
  imageUrl: "https://example.com/icon.png",
};

describe("cli/commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  function stdoutText(): string {
    return stdoutSpy.mock.calls.map((c) => c[0]).join("");
  }

  it("search: calls searchGames + emits JSON", async () => {
    const searchGames = vi.fn().mockResolvedValue([SAMPLE_SUMMARY]);
    const run = makeRunner({ searchGames });
    const exit = await run(["--json", "search", "sample", "--limit", "5"]);
    expect(searchGames).toHaveBeenCalledWith("sample", { limit: 5 });
    expect(JSON.parse(stdoutText())).toEqual({ results: [SAMPLE_SUMMARY] });
    expect(exit).not.toHaveBeenCalled();
  });

  it("search: rejects out-of-range --limit with exit code 1", async () => {
    const searchGames = vi.fn();
    const run = makeRunner({ searchGames });
    const exit = await run(["search", "x", "--limit", "999"]);
    expect(searchGames).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("game: prints pretty key:value block and calls getGames", async () => {
    const getGames = vi.fn().mockResolvedValue([SAMPLE_GAME]);
    const run = makeRunner({ getGames });
    const exit = await run(["game", "11"]);
    expect(getGames).toHaveBeenCalledWith([11]);
    expect(stdoutText()).toContain("Sample Game");
    expect(exit).not.toHaveBeenCalled();
  });

  it("game: empty result triggers ROBLOX_NOT_FOUND with exit code 2", async () => {
    const getGames = vi.fn().mockResolvedValue([]);
    const run = makeRunner({ getGames });
    const exit = await run(["game", "404"]);
    expect(exit).toHaveBeenCalledWith(2);
  });

  it("players: emits an object keyed by `counts` in JSON mode", async () => {
    const getGames = vi.fn().mockResolvedValue([SAMPLE_GAME]);
    const run = makeRunner({ getGames });
    await run(["--json", "players", "11", "12"]);
    expect(getGames).toHaveBeenCalledWith([11, 12]);
    expect(JSON.parse(stdoutText())).toEqual({
      counts: [{ universeId: 11, name: "Sample Game", playing: 1234, visits: 50_000_000 }],
    });
  });

  it("compare: requires at least 2 ids (Commander error → exit 1)", async () => {
    const getGames = vi.fn();
    const run = makeRunner({ getGames });
    const exit = await run(["compare", "11"]);
    expect(getGames).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
  });

  it("compare: renders side-by-side JSON for >=2 ids", async () => {
    const getGames = vi.fn().mockResolvedValue([SAMPLE_GAME, { ...SAMPLE_GAME, id: 12 }]);
    const run = makeRunner({ getGames });
    await run(["--json", "compare", "11", "12"]);
    expect(getGames).toHaveBeenCalledWith([11, 12]);
    const out = JSON.parse(stdoutText());
    expect(out.games).toHaveLength(2);
  });

  it("creator: passes userId through to getCreator", async () => {
    const getCreator = vi.fn().mockResolvedValue(SAMPLE_USER);
    const run = makeRunner({ getCreator });
    await run(["--json", "creator", "1"]);
    expect(getCreator).toHaveBeenCalledWith(1);
    expect(JSON.parse(stdoutText())).toEqual({ user: SAMPLE_USER });
  });

  it("group: passes groupId through to getGroup", async () => {
    const getGroup = vi.fn().mockResolvedValue(SAMPLE_GROUP);
    const run = makeRunner({ getGroup });
    await run(["--json", "group", "7"]);
    expect(getGroup).toHaveBeenCalledWith(7);
    expect(JSON.parse(stdoutText())).toEqual({ group: SAMPLE_GROUP });
  });

  it("icon: defaults size to 512x512 and prints the URL", async () => {
    const getGameIcons = vi.fn().mockResolvedValue([SAMPLE_ICON]);
    const run = makeRunner({ getGameIcons });
    await run(["icon", "11"]);
    expect(getGameIcons).toHaveBeenCalledWith([11], "512x512");
    expect(stdoutText()).toContain("https://example.com/icon.png");
  });

  it("icon: rejects bogus --size with exit code 1", async () => {
    const getGameIcons = vi.fn();
    const run = makeRunner({ getGameIcons });
    const exit = await run(["icon", "11", "--size", "bogus"]);
    expect(getGameIcons).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("icon: --size 256x256 forwards to getGameIcons", async () => {
    const getGameIcons = vi.fn().mockResolvedValue([SAMPLE_ICON]);
    const run = makeRunner({ getGameIcons });
    await run(["icon", "11", "--size", "256x256", "--json"]);
    expect(getGameIcons).toHaveBeenCalledWith([11], "256x256");
  });

  it("propagates upstream errors with the correct exit code", async () => {
    const getGames = vi.fn().mockRejectedValue(new RobloxNotFoundError("nope", { endpoint: "/x" }));
    const run = makeRunner({ getGames });
    const exit = await run(["game", "11"]);
    expect(exit).toHaveBeenCalledWith(2);
  });

  it("emits a JSON error doc in --json mode on failure", async () => {
    const getGames = vi
      .fn()
      .mockRejectedValue(new BloxscoutError("validation oops", "VALIDATION_ERROR"));
    const run = makeRunner({ getGames });
    const exit = await run(["--json", "game", "11"]);
    expect(exit).toHaveBeenCalledWith(1);
    const parsed = JSON.parse(stdoutText());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  // suppress unused CreatorGame import warnings
  void (null as unknown as CreatorGame);
});
