import { GameSchema } from "@bloxscout/core/schemas";
import { z } from "zod";
import { analyzeGameVsGenre } from "./analyze-game-vs-genre.js";
import { getTopByGenre } from "./get-top-by-genre.js";
import type { ToolDefinition } from "./types.js";

export const GenerateMarketReportInputSchema = z.object({
  genre: z.string().min(1),
  focusUniverseId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

const CreatorStatSchema = z.object({
  creatorId: z.number().int().nonnegative(),
  creatorName: z.string(),
  creatorType: z.enum(["User", "Group"]),
  totalPlaying: z.number().int().nonnegative(),
  gameCount: z.number().int().nonnegative(),
});

export const GenerateMarketReportOutputSchema = z.object({
  genre: z.string(),
  generatedAt: z.string(),
  markdown: z.string(),
  structured: z.object({
    topGames: z.array(GameSchema),
    aggregates: z.object({
      gameCount: z.number().int().nonnegative(),
      totalCcu: z.number().int().nonnegative(),
      medianCcu: z.number().nonnegative(),
      totalVisits: z.number().int().nonnegative(),
      totalFavorites: z.number().int().nonnegative(),
      topCreator: CreatorStatSchema.nullable(),
      notableCreators: z.array(CreatorStatSchema),
    }),
    focusComparison: z
      .object({
        universeId: z.number().int().positive(),
        gameName: z.string(),
        playingPercentile: z.number().min(0).max(100),
        visitsPercentile: z.number().min(0).max(100),
        favoritedPercentile: z.number().min(0).max(100),
        playingVsMedian: z.number(),
        cohortSize: z.number().int().nonnegative(),
      })
      .optional(),
  }),
});

interface CreatorAccumulator {
  creatorId: number;
  creatorName: string;
  creatorType: "User" | "Group";
  totalPlaying: number;
  gameCount: number;
}

/**
 * Synthesis tool: composes `get_top_by_genre` (always) + `analyze_game_vs_genre`
 * (when `focusUniverseId` is set) into a single agent-friendly market report.
 *
 * Designed to replace what would otherwise be 3-5 sequential tool calls when
 * an agent is asked to "write up the simulator market" — calling the handlers
 * directly (rather than going back through the MCP dispatcher) keeps the
 * latency profile predictable and the error surface unified.
 */
export const generateMarketReport: ToolDefinition<
  typeof GenerateMarketReportInputSchema,
  typeof GenerateMarketReportOutputSchema
> = {
  name: "generate_market_report",
  description: [
    "Generate a written market report for a Roblox genre. Returns both a",
    "ready-to-show markdown document (sections: Top games, Aggregate stats,",
    "Focus game vs genre [if applicable], Notable creators) and a",
    "`structured` JSON payload with the same numbers so the agent can quote",
    "exact figures or feed the data into a follow-up tool.",
    "",
    "Inputs: `genre` (required, same slugs as `get_top_by_genre` — e.g.",
    "simulator, rpg, fps); `focusUniverseId` (optional, adds a 'this game",
    "vs the cohort' section via `analyze_game_vs_genre`); `limit` (1-20,",
    "default 10) — how many top games to include.",
    "",
    "This is a synthesis tool — it makes multiple internal Roblox API calls.",
    "Expect higher latency (5-15s). Prefer it over individually calling",
    "get_top_by_genre + compare_games + analyze_game_vs_genre when the user",
    "wants a written report.",
  ].join(" "),
  inputSchema: GenerateMarketReportInputSchema,
  outputSchema: GenerateMarketReportOutputSchema,
  handler: async (input, ctx) => {
    const generatedAt = new Date().toISOString();

    // 1. Top games via the existing tool — reuses its curated seed list and
    //    canonical error surface (unknown genre -> VALIDATION_ERROR).
    const topRes = await getTopByGenre.handler(
      {
        genre: input.genre,
        rankBy: "playing",
        limit: input.limit,
      },
      ctx,
    );
    const topGames = topRes.games;

    // 2. Aggregates over the trimmed top-N set.
    const ccus = topGames.map((g) => g.playing);
    const totalCcu = ccus.reduce((a, b) => a + b, 0);
    const medianCcu = median(ccus);
    const totalVisits = topGames.reduce((a, g) => a + g.visits, 0);
    const totalFavorites = topGames.reduce((a, g) => a + g.favoritedCount, 0);

    const creatorMap = new Map<string, CreatorAccumulator>();
    for (const g of topGames) {
      const key = `${g.creator.type}:${g.creator.id}`;
      const prev = creatorMap.get(key);
      if (prev) {
        prev.totalPlaying += g.playing;
        prev.gameCount += 1;
      } else {
        creatorMap.set(key, {
          creatorId: g.creator.id,
          creatorName: g.creator.name,
          creatorType: g.creator.type,
          totalPlaying: g.playing,
          gameCount: 1,
        });
      }
    }
    const creators = [...creatorMap.values()].sort((a, b) => b.totalPlaying - a.totalPlaying);
    const topCreator = creators[0] ?? null;
    const notableCreators = creators.slice(0, 5);

    // 3. Focus comparison (optional).
    let focusComparison: z.infer<
      typeof GenerateMarketReportOutputSchema
    >["structured"]["focusComparison"];
    let focusMarkdown = "";
    if (input.focusUniverseId !== undefined) {
      const cmp = await analyzeGameVsGenre.handler(
        {
          universeId: input.focusUniverseId,
          genre: input.genre,
          cohortLimit: Math.max(input.limit, 20),
        },
        ctx,
      );
      const playingVsMedian =
        cmp.metrics.playing.genreMedian === 0
          ? 0
          : cmp.metrics.playing.value / cmp.metrics.playing.genreMedian;
      focusComparison = {
        universeId: cmp.game.id,
        gameName: cmp.game.name,
        playingPercentile: cmp.metrics.playing.percentile,
        visitsPercentile: cmp.metrics.visits.percentile,
        favoritedPercentile: cmp.metrics.favoritedCount.percentile,
        playingVsMedian,
        cohortSize: cmp.cohortSize,
      };
      focusMarkdown = renderFocusSection(focusComparison);
    }

    // 4. Render markdown. Each section is an H2 so agents / readers can
    //    navigate the doc with a TOC.
    const markdownParts: string[] = [
      `# Market report: ${input.genre}`,
      `_Generated ${generatedAt}_`,
      "",
      "## Top games",
      renderTopGamesTable(topGames),
      "",
      "## Aggregate stats",
      renderAggregates({
        gameCount: topGames.length,
        totalCcu,
        medianCcu,
        totalVisits,
        totalFavorites,
      }),
    ];
    if (focusMarkdown.length > 0) {
      markdownParts.push("", focusMarkdown);
    }
    markdownParts.push("", "## Notable creators", renderCreators(notableCreators));
    const markdown = markdownParts.join("\n");

    return {
      genre: input.genre,
      generatedAt,
      markdown,
      structured: {
        topGames,
        aggregates: {
          gameCount: topGames.length,
          totalCcu,
          medianCcu,
          totalVisits,
          totalFavorites,
          topCreator,
          notableCreators,
        },
        ...(focusComparison ? { focusComparison } : {}),
      },
    };
  },
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  // biome-ignore lint/style/noNonNullAssertion: bounds guarded above
  return sorted[mid]!;
}

function renderTopGamesTable(games: ReadonlyArray<z.infer<typeof GameSchema>>): string {
  if (games.length === 0) return "_No games found for this genre._";
  const lines = [
    "| # | Game | Creator | CCU | Visits | Favorites |",
    "| --- | --- | --- | ---: | ---: | ---: |",
  ];
  for (const [idx, g] of games.entries()) {
    lines.push(
      `| ${idx + 1} | ${escapeCell(g.name)} | ${escapeCell(g.creator.name)} | ${g.playing.toLocaleString()} | ${g.visits.toLocaleString()} | ${g.favoritedCount.toLocaleString()} |`,
    );
  }
  return lines.join("\n");
}

function renderAggregates(a: {
  gameCount: number;
  totalCcu: number;
  medianCcu: number;
  totalVisits: number;
  totalFavorites: number;
}): string {
  return [
    `- Games covered: **${a.gameCount}**`,
    `- Total CCU: **${a.totalCcu.toLocaleString()}**`,
    `- Median CCU: **${Math.round(a.medianCcu).toLocaleString()}**`,
    `- Total visits: **${a.totalVisits.toLocaleString()}**`,
    `- Total favorites: **${a.totalFavorites.toLocaleString()}**`,
  ].join("\n");
}

function renderFocusSection(f: {
  universeId: number;
  gameName: string;
  playingPercentile: number;
  visitsPercentile: number;
  favoritedPercentile: number;
  playingVsMedian: number;
  cohortSize: number;
}): string {
  return [
    "## Focus game vs genre",
    `- Game: **${escapeCell(f.gameName)}** (universeId ${f.universeId})`,
    `- Cohort size: ${f.cohortSize}`,
    `- CCU percentile: **${f.playingPercentile.toFixed(1)}**`,
    `- Visits percentile: **${f.visitsPercentile.toFixed(1)}**`,
    `- Favorites percentile: **${f.favoritedPercentile.toFixed(1)}**`,
    `- CCU vs median: **${f.playingVsMedian.toFixed(2)}x**`,
  ].join("\n");
}

function renderCreators(creators: ReadonlyArray<CreatorAccumulator>): string {
  if (creators.length === 0) return "_No creator data._";
  const lines = ["| Creator | Type | Games | Combined CCU |", "| --- | --- | ---: | ---: |"];
  for (const c of creators) {
    lines.push(
      `| ${escapeCell(c.creatorName)} | ${c.creatorType} | ${c.gameCount} | ${c.totalPlaying.toLocaleString()} |`,
    );
  }
  return lines.join("\n");
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
