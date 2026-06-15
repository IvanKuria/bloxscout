/**
 * Revenue estimation for the AI agent — answers "how much does <game> make?"
 * and "which genres earn the most?".
 *
 * Two modes, one shape:
 *   - GAME: resolve a single named game's live CCU (live Roblox fetch) and run
 *     the SAME pure `estimateGameRevenue` heuristic the pipeline uses, so a
 *     per-game answer is consistent with the genre aggregates.
 *   - GENRE / LEADERBOARD: read the pre-computed `genre-revenue.json` hosted
 *     view (no fetch) — it already sums per-game estimates across the dataset.
 *
 * Every figure is a heuristic with an order-of-magnitude variance; the result
 * ALWAYS carries the calculator's `assumptions` + `disclaimer` so the agent is
 * forced to surface the caveat (the system prompt enforces leading with it).
 *
 * SERVER-ONLY: live mode uses `@bloxscout/core`'s RobloxClient. Never throws —
 * returns `ok:false` + a `note` so the copilot answers honestly.
 */
import "server-only";
import { cache } from "react";
import {
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  estimateGameRevenue,
  REVENUE_ESTIMATE_DISCLAIMER,
} from "@bloxscout/core/calculators";
import { genreMonetizationOverride } from "@bloxscout/core/genre-monetization";
import type { GenreRevenueEntry } from "@bloxscout/core/hosted-format";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { getGenreRevenue } from "@/lib/data";
import { genreSlug } from "@/lib/format";
import { getThumbnails } from "@/lib/thumbnails";

const roblox = new RobloxClient();

/** Must match the pipeline's `genreRevenueView` so per-game ≈ per-genre math. */
const REVENUE_DAYS_ACTIVE = 30;

export interface RevenueAssumptions {
  conversionRate: number;
  averageRobuxPerPayingUser: number;
  daysActive: number;
  rateUsdPerRobux: number;
}

/** A single-game revenue estimate. */
export interface RevenueGame {
  universeId: number;
  name: string | null;
  genre: string | null;
  playing: number;
  estMonthlyUsd: number;
  estMonthlyRobux: number;
  /** True when a per-genre monetization override tuned the assumptions. */
  assumptionsOverridden: boolean;
  thumbnailUrl: string | null;
}

export interface RevenueResult {
  ok: boolean;
  mode: "game" | "genre" | "leaderboard";
  title: string;
  generatedAt: string | null;
  confidence: "low";
  /** The assumptions baked into every figure in this result. */
  assumptions: RevenueAssumptions;
  /** "Varies 5-10x" caveat — the agent MUST lead with this. */
  disclaimer: string;
  /** Present in `game` mode. */
  game?: RevenueGame;
  /** Present in `genre` mode — the focused genre's aggregate. */
  genre?: GenreRevenueEntry;
  /** Present in `genre` (context) and `leaderboard` modes. */
  rows?: GenreRevenueEntry[];
  note?: string;
}

export interface EstimateRevenueInput {
  genre?: string;
  universeId?: number;
  gameName?: string;
  limit?: number;
}

/** The calculator defaults, surfaced when the hosted view is unavailable. */
function baselineAssumptions(): RevenueAssumptions {
  const baseline = estimateGameRevenue(
    { playing: 0, visits: 0 },
    { daysActive: REVENUE_DAYS_ACTIVE },
  );
  return {
    conversionRate: baseline.inputs.conversionRate,
    averageRobuxPerPayingUser: baseline.inputs.averageRobuxPerPayingUser,
    daysActive: REVENUE_DAYS_ACTIVE,
    rateUsdPerRobux: DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  };
}

function clampLimit(input: unknown, fallback: number, max: number): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
}

interface ResolvedGame {
  universeId: number;
  name: string | null;
  genre: string | null;
  playing: number;
  visits: number;
}

/** Resolve a single game's live stats by id or name. `null` if not found. */
async function resolveGame(
  input: EstimateRevenueInput,
): Promise<ResolvedGame | null> {
  // By universe id: one live detail fetch.
  if (typeof input.universeId === "number" && input.universeId > 0) {
    try {
      const [g] = await roblox.getGames([input.universeId]);
      if (g) {
        return {
          universeId: g.id,
          name: g.name,
          genre: g.genre || null,
          playing: Math.max(0, g.playing),
          visits: Math.max(0, g.visits),
        };
      }
    } catch {
      // fall through to "not found"
    }
    return null;
  }

  // By name: search, take the best live match, enrich with a detail fetch.
  const q = (input.gameName ?? "").trim();
  if (!q) return null;
  let matches: Awaited<ReturnType<RobloxClient["searchGames"]>>;
  try {
    matches = await roblox.searchGames(q, { limit: 5 });
  } catch {
    return null;
  }
  const m =
    matches.find((x) => Number.isFinite(x.playerCount)) ?? matches[0];
  if (!m) return null;
  try {
    const [g] = await roblox.getGames([m.universeId]);
    if (g) {
      return {
        universeId: g.id,
        name: g.name,
        genre: g.genre || null,
        playing: Math.max(0, g.playing),
        visits: Math.max(0, g.visits),
      };
    }
  } catch {
    // fall back to the search row (no visits/genre, but a live CCU)
  }
  return {
    universeId: m.universeId,
    name: m.name,
    genre: null,
    playing: Math.max(0, m.playerCount),
    visits: 0,
  };
}

async function estimateGameMode(
  input: EstimateRevenueInput,
): Promise<RevenueResult> {
  const resolved = await resolveGame(input);
  if (!resolved) {
    return {
      ok: false,
      mode: "game",
      title: "Revenue estimate",
      generatedAt: null,
      confidence: "low",
      assumptions: baselineAssumptions(),
      disclaimer: REVENUE_ESTIMATE_DISCLAIMER,
      note:
        "Couldn't find that game on Roblox right now. Check the name, or pass a universe id.",
    };
  }

  const override = genreMonetizationOverride(resolved.genre);
  const opts = {
    daysActive: REVENUE_DAYS_ACTIVE,
    ...(override?.conversionRate !== undefined
      ? { conversionRate: override.conversionRate }
      : {}),
    ...(override?.averageRobuxPerPayingUser !== undefined
      ? { averageRobuxPerPayingUser: override.averageRobuxPerPayingUser }
      : {}),
  };
  const est = estimateGameRevenue(
    { playing: resolved.playing, visits: resolved.visits },
    opts,
  );
  const thumbs = await getThumbnails([resolved.universeId]);

  return {
    ok: true,
    mode: "game",
    title: `${resolved.name ?? "Game"} — revenue estimate`,
    generatedAt: null,
    confidence: "low",
    assumptions: {
      conversionRate: est.inputs.conversionRate,
      averageRobuxPerPayingUser: est.inputs.averageRobuxPerPayingUser,
      daysActive: est.inputs.daysActive,
      rateUsdPerRobux: est.inputs.rateUsdPerRobux,
    },
    disclaimer: est.disclaimer,
    game: {
      universeId: resolved.universeId,
      name: resolved.name,
      genre: resolved.genre,
      playing: resolved.playing,
      estMonthlyUsd: est.estimatedMonthlyUsd,
      estMonthlyRobux: est.estimatedMonthlyRobux,
      assumptionsOverridden: override !== null,
      thumbnailUrl: thumbs.get(resolved.universeId) ?? null,
    },
    note:
      resolved.playing === 0
        ? "This game shows 0 live players right now, so the estimate is ~$0 — revenue scales with concurrent players under this heuristic."
        : undefined,
  };
}

const VIEW_EMPTY_NOTE =
  "Genre revenue is still computing — the hosted dataset is young. Treat this " +
  "as “not available yet,” not zero.";

/**
 * Estimate revenue. Game mode live-fetches one game; genre/leaderboard modes
 * read the pre-computed hosted view. Never throws.
 */
export const estimateRevenue = cache(
  async (input: EstimateRevenueInput): Promise<RevenueResult> => {
    const wantsGame =
      (typeof input.universeId === "number" && input.universeId > 0) ||
      (typeof input.gameName === "string" && input.gameName.trim() !== "");
    if (wantsGame) return estimateGameMode(input);

    const view = await getGenreRevenue();
    const genre = typeof input.genre === "string" ? input.genre.trim() : "";
    if (!view) {
      return {
        ok: false,
        mode: genre ? "genre" : "leaderboard",
        title: genre ? `Revenue — ${genre}` : "Top earning genres",
        generatedAt: null,
        confidence: "low",
        assumptions: baselineAssumptions(),
        disclaimer: REVENUE_ESTIMATE_DISCLAIMER,
        note: VIEW_EMPTY_NOTE,
      };
    }

    const assumptions: RevenueAssumptions = {
      conversionRate: view.assumptions.conversionRate,
      averageRobuxPerPayingUser: view.assumptions.averageRobuxPerPayingUser,
      daysActive: view.assumptions.daysActive,
      rateUsdPerRobux: view.assumptions.rateUsdPerRobux,
    };
    const ranked = view.entries
      .slice()
      .sort((a, b) => b.estTotalMonthlyUsd - a.estTotalMonthlyUsd);

    // Genre mode: focus one genre, with the leaderboard for context.
    if (genre) {
      const want = genreSlug(genre);
      const focus = ranked.find((e) => genreSlug(e.genre) === want) ?? null;
      const limit = clampLimit(input.limit, 6, 12);
      return {
        ok: focus !== null,
        mode: "genre",
        title: focus ? `Revenue — ${focus.genre}` : `Revenue — ${genre}`,
        generatedAt: view.generatedAt,
        confidence: "low",
        assumptions,
        disclaimer: view.disclaimer,
        ...(focus ? { genre: focus } : {}),
        rows: ranked.slice(0, limit),
        note: focus
          ? undefined
          : `“${genre}” isn't scored yet — showing the top earners instead.`,
      };
    }

    // Leaderboard mode.
    const limit = clampLimit(input.limit, 6, 12);
    return {
      ok: true,
      mode: "leaderboard",
      title: "Top earning genres",
      generatedAt: view.generatedAt,
      confidence: "low",
      assumptions,
      disclaimer: view.disclaimer,
      rows: ranked.slice(0, limit),
    };
  },
);
