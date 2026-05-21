import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it, vi } from "vitest";
import type { RobloxClient } from "../../src/core/roblox-client.js";
import { createMcpServer } from "../../src/mcp/server.js";
import { allTools } from "../../src/mcp/tools/index.js";

/**
 * Tests reach into the server's underlying request-handler map via the SDK's
 * `Protocol._requestHandlers` private. This is a deliberate test-only escape
 * hatch — the SDK does not expose a public dispatch entry point, and we want
 * to verify routing without spinning up a full stdio transport pair.
 */
// biome-ignore lint/suspicious/noExplicitAny: SDK private surface
function dispatch(server: any, schema: any, params: Record<string, unknown>) {
  const method = schema.shape.method.value as string;
  const handler = server._requestHandlers.get(method);
  if (handler === undefined) {
    throw new Error(`no handler registered for ${method}`);
  }
  return handler({ method, params }, { signal: new AbortController().signal });
}

function stubClient(overrides: Partial<Record<keyof RobloxClient, unknown>> = {}): RobloxClient {
  return {
    searchGames: vi.fn(),
    getGames: vi.fn(),
    getPlayerCounts: vi.fn(),
    getCreator: vi.fn(),
    getGroup: vi.fn(),
    getGameIcons: vi.fn(),
    getCreatorGames: vi.fn(),
    getTrendingGames: vi.fn(),
    ...overrides,
  } as unknown as RobloxClient;
}

describe("createMcpServer — tools/list", () => {
  it("returns metadata for all 16 v0.1 tools", async () => {
    const server = createMcpServer({ client: stubClient() });
    const res = (await dispatch(server, ListToolsRequestSchema, {})) as {
      tools: Array<{ name: string; description: string; inputSchema: unknown }>;
    };
    expect(res.tools).toHaveLength(16);
    const names = res.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "analyze_game_vs_genre",
      "calculate_devex",
      "compare_games",
      "estimate_game_revenue",
      "get_creator",
      "get_game",
      "get_game_history",
      "get_game_icons",
      "get_game_player_count",
      "get_group",
      "get_top_by_genre",
      "get_top_creators_by_genre",
      "get_trending_games",
      "get_up_and_coming",
      "search_games",
      "snapshot_game",
    ]);
    for (const tool of res.tools) {
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.inputSchema).toBeTypeOf("object");
    }
  });

  it("registry matches the exported `allTools` array", () => {
    expect(allTools.map((t) => t.name).sort()).toEqual([
      "analyze_game_vs_genre",
      "calculate_devex",
      "compare_games",
      "estimate_game_revenue",
      "get_creator",
      "get_game",
      "get_game_history",
      "get_game_icons",
      "get_game_player_count",
      "get_group",
      "get_top_by_genre",
      "get_top_creators_by_genre",
      "get_trending_games",
      "get_up_and_coming",
      "search_games",
      "snapshot_game",
    ]);
  });
});

describe("createMcpServer — tools/call dispatch", () => {
  it("returns isError + structured payload on unknown tool name", async () => {
    const server = createMcpServer({ client: stubClient() });
    const res = (await dispatch(server, CallToolRequestSchema, {
      name: "does_not_exist",
      arguments: {},
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("Unknown tool");
    expect(res.content[0]?.text).toContain("VALIDATION_ERROR");
  });

  it("returns isError on invalid arguments instead of crashing", async () => {
    const server = createMcpServer({ client: stubClient() });
    const res = (await dispatch(server, CallToolRequestSchema, {
      name: "get_game",
      arguments: { universeId: -1 },
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain("VALIDATION_ERROR");
  });

  it("invokes the tool handler and returns JSON-stringified result on success", async () => {
    const getGames = vi.fn().mockResolvedValue([
      {
        id: 42,
        rootPlaceId: 420,
        name: "Test",
        description: "",
        sourceName: null,
        sourceDescription: null,
        creator: {
          id: 1,
          name: "c",
          type: "User",
          isRNVAccount: false,
          hasVerifiedBadge: false,
        },
        price: null,
        allowedGearGenres: [],
        allowedGearCategories: [],
        isGenreEnforced: false,
        copyingAllowed: false,
        playing: 1,
        visits: 1,
        maxPlayers: 10,
        created: "2020-01-01T00:00:00Z",
        updated: "2020-01-02T00:00:00Z",
        studioAccessToApisAllowed: false,
        createVipServersAllowed: false,
        universeAvatarType: "MorphToR15",
        genre: "All",
        genre_l1: "",
        genre_l2: "",
        isAllGenre: true,
        isFavoritedByUser: false,
        favoritedCount: 0,
      },
    ]);
    const server = createMcpServer({ client: stubClient({ getGames }) });
    const res = (await dispatch(server, CallToolRequestSchema, {
      name: "get_game",
      arguments: { universeId: 42 },
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(res.isError).toBeUndefined();
    expect(getGames).toHaveBeenCalledWith([42]);
    const parsed = JSON.parse(res.content[0]?.text ?? "{}");
    expect(parsed.game.id).toBe(42);
  });

  it("maps thrown errors through mapToMcpError and surfaces code in payload", async () => {
    const getCreator = vi.fn().mockRejectedValue(
      Object.assign(new Error("user 999 not found"), {
        // Force the error into the RobloxApiError-mapping branch by constructing
        // a minimal instance — see mapToMcpError; for this test we use a
        // BloxscoutError stand-in via dynamic import below.
      }),
    );
    const server = createMcpServer({ client: stubClient({ getCreator }) });
    const res = (await dispatch(server, CallToolRequestSchema, {
      name: "get_creator",
      arguments: { userId: 999 },
    })) as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(res.isError).toBe(true);
    // Plain Error maps to INTERNAL_ERROR per mapToMcpError's fallback branch.
    expect(res.content[0]?.text).toContain("INTERNAL_ERROR");
  });
});
