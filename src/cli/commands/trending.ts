import { Command } from "commander";
import type { HostedDataClient } from "../../core/hosted-data.js";
import type { RobloxClient } from "../../core/roblox-client.js";
import { getTrendingGames } from "../../mcp/tools/get-trending-games.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, print } from "../format.js";
import { formatPct, hostedCtx } from "./momentum.js";

interface TrendingOpts {
  genre?: string;
  limit?: string;
}

/**
 * `bloxscout trending [--genre <g>] [--limit <n>]` — thin CLI wrapper around
 * the `get_trending_games` MCP tool. With hosted data available, games are
 * ranked by real 24h growth (growth columns shown); otherwise falls back to
 * the live current-CCU ranking.
 */
export function buildTrendingCommand(
  getClient: () => RobloxClient,
  getHosted: () => HostedDataClient | undefined = () => undefined,
): Command {
  return new Command("trending")
    .description("List trending games (24h growth when hosted data is available)")
    .option("-g, --genre <genre>", "filter to a single genre (e.g. simulator, rpg, fps)")
    .option("-l, --limit <n>", "max games returned (1-100)", "25")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout trending --limit 10\n  $ bloxscout trending --genre simulator --limit 5\n  $ bloxscout trending --json",
    )
    .action(async (options: TrendingOpts, command: Command) => {
      const limit = parseLimit(options.limit, 25);
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await getTrendingGames.handler(
        {
          ...(options.genre !== undefined ? { genre: options.genre } : {}),
          limit,
        },
        hostedCtx(getClient, getHosted),
      );
      const games = result.games;
      const scope = options.genre !== undefined ? `in ${options.genre} ` : "";
      const title =
        result.source === "hosted"
          ? `Trending ${scope}by 24h growth (${games.length})`
          : `Trending ${scope}now (${games.length})`;
      const spec =
        result.source === "hosted"
          ? {
              title,
              head: ["#", "name", "creator", "playing", "24h", "7d"],
              rows: games,
              toRow: (g: (typeof games)[number], idx: number) => [
                idx + 1,
                g.name,
                g.creator.name,
                g.playing,
                formatPct(g.growth24hPct ?? null),
                formatPct(g.growth7dPct ?? null),
              ],
              alignments: ["right", "left", "left", "right", "right", "right"] as Array<
                "left" | "right" | "center"
              >,
            }
          : {
              title,
              head: ["#", "name", "creator", "playing", "visits"],
              rows: games,
              toRow: (g: (typeof games)[number], idx: number) => [
                idx + 1,
                g.name,
                g.creator.name,
                g.playing,
                g.visits,
              ],
              alignments: ["right", "left", "left", "right", "right"] as Array<
                "left" | "right" | "center"
              >,
            };
      print(result, { kind: "table", spec }, fmt);
    });
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new BloxscoutError("limit must be an integer between 1 and 100", "VALIDATION_ERROR");
  }
  return n;
}
