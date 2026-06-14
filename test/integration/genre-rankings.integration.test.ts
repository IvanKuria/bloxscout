import { RobloxClient } from "@bloxscout/core/roblox-client";
import { describe, expect, it } from "vitest";
import { generateMarketReport } from "../../src/mcp/tools/generate_market_report.js";
import { getTopByGenre } from "../../src/mcp/tools/get-top-by-genre.js";
import { getTrendingGames } from "../../src/mcp/tools/get-trending-games.js";

/**
 * Live regression suite for #34 — guards against the genre tools regressing
 * back to a static seed list that resolves to empty / template games. Each
 * test asserts that at least one returned game has non-trivial live CCU,
 * which a stale seed list (the pre-fix behaviour) would fail.
 *
 * Skipped unless `INTEGRATION=1` so the default `pnpm test` run stays
 * hermetic; the nightly `integration.yml` workflow sets the env var.
 */
const enabled = process.env.INTEGRATION === "1";
const d = enabled ? describe : describe.skip;

const MIN_CCU = 100;

d("Genre ranking tools (integration, #34 regression)", () => {
  const client = new RobloxClient();
  const ctx = { client };

  for (const genre of ["simulator", "rpg", "obby"]) {
    it(`get_top_by_genre ${genre} returns at least one game with CCU > ${MIN_CCU}`, async () => {
      const out = await getTopByGenre.handler({ genre, rankBy: "playing", limit: 5 }, ctx);
      expect(out.games.length).toBeGreaterThan(0);
      const maxCcu = Math.max(...out.games.map((g) => g.playing));
      expect(maxCcu).toBeGreaterThan(MIN_CCU);
    }, 30_000);
  }

  it("get_trending_games (no genre) returns at least one game with CCU > MIN_CCU", async () => {
    const out = await getTrendingGames.handler({ limit: 10 }, ctx);
    expect(out.games.length).toBeGreaterThan(0);
    const maxCcu = Math.max(...out.games.map((g) => g.playing));
    expect(maxCcu).toBeGreaterThan(MIN_CCU);
  }, 60_000);

  it("generate_market_report simulator markdown surfaces real top games", async () => {
    const out = await generateMarketReport.handler({ genre: "simulator", limit: 5 }, ctx);
    expect(out.structured.topGames.length).toBeGreaterThan(0);
    const maxCcu = Math.max(...out.structured.topGames.map((g) => g.playing));
    expect(maxCcu).toBeGreaterThan(MIN_CCU);
    expect(out.markdown).toContain("# Market report: simulator");
    // The markdown table should embed a non-zero CCU for at least one game.
    // (A stale-seed-list regression would render all zeros.)
    expect(out.structured.aggregates.totalCcu).toBeGreaterThan(MIN_CCU);
  }, 60_000);

  // v0.1.2 regression (#40): tower-defense is one of the biggest Roblox
  // genres and was previously rejected at the tool boundary. This guards
  // against re-introducing any allowlist gate.
  it("generate_market_report tower-defense returns real games (#40)", async () => {
    const out = await generateMarketReport.handler({ genre: "tower-defense", limit: 5 }, ctx);
    expect(out.structured.topGames.length).toBeGreaterThan(0);
    const maxCcu = Math.max(...out.structured.topGames.map((g) => g.playing));
    expect(maxCcu).toBeGreaterThan(MIN_CCU);
    expect(out.markdown).toContain("# Market report: tower-defense");
  }, 60_000);
});
