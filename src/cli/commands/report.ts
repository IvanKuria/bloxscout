import { Command } from "commander";
import type { RobloxClient } from "../../core/roblox-client.js";
import { generateMarketReport } from "../../mcp/tools/generate_market_report.js";
import { BloxscoutError } from "../../shared/errors.js";
import { getFormatOptions, printText } from "../format.js";

interface ReportOpts {
  genre: string;
  focus?: string;
  limit?: string;
}

/**
 * `bloxscout report --genre <g>` — generates a written market report. Pretty
 * mode prints the tool's pre-rendered `markdown` field as-is (great for a
 * piped `glow` / screenshot demo); JSON mode emits the full structured
 * payload (top games, aggregates, focus comparison, creators).
 */
export function buildReportCommand(getClient: () => RobloxClient): Command {
  return new Command("report")
    .description("Generate a market report (markdown) for a Roblox genre")
    .requiredOption("-g, --genre <genre>", "genre slug (e.g. simulator, rpg, fps, obby)")
    .option(
      "-f, --focus <universeId>",
      "optional universeId for a 'this game vs the cohort' section",
    )
    .option("-l, --limit <n>", "top-N games to include (1-20)", "10")
    .addHelpText(
      "after",
      "\nExamples:\n  $ bloxscout report --genre simulator\n  $ bloxscout report --genre rpg --limit 5\n  $ bloxscout report --genre simulator --focus 920587237 --json --pretty",
    )
    .action(async (options: ReportOpts, command: Command) => {
      const limit = parseLimit(options.limit, 10);
      const focusUniverseId = options.focus !== undefined ? parseFocus(options.focus) : undefined;
      const fmt = getFormatOptions(command.optsWithGlobals());
      const result = await generateMarketReport.handler(
        {
          genre: options.genre,
          limit,
          ...(focusUniverseId !== undefined ? { focusUniverseId } : {}),
        },
        { client: getClient() },
      );
      printText(result, result.markdown, fmt);
    });
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new BloxscoutError("limit must be an integer between 1 and 20", "VALIDATION_ERROR");
  }
  return n;
}

function parseFocus(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new BloxscoutError(
      `--focus must be a positive integer universeId (got "${raw}")`,
      "VALIDATION_ERROR",
    );
  }
  return n;
}
