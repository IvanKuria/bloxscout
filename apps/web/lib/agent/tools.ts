/**
 * Copilot tool registry — the keystone that bridges the hosted-data readers
 * (`lib/data.ts`) to Claude tool-use and to the inline generative-UI widgets.
 *
 * SERVER-ONLY: each tool's `execute` calls `lib/data.ts`, which wraps the
 * server-only `HostedDataClient`. The Claude tool *definitions* (name +
 * description + JSON schema) are plain data and are imported by the client
 * widget layer too — that shared `toolName` string is the contract that keeps
 * the agent loop and the widget `render` map in lockstep.
 *
 * The tool→widget contract:
 *   - Each tool returns a small, JSON-serializable `result` object.
 *   - `components/copilot/widgets.tsx` maps `toolName` → a recon-themed React
 *     component whose props are exactly that `result` shape.
 *   - The model NEVER emits UI — it chooses which tool to call; the app owns
 *     rendering. Every figure a widget shows traces to a tool result.
 *
 * To add an analysis tool: append an entry here (definition + execute), then
 * add a matching `render` in widgets.tsx keyed on the same `name`. Nothing
 * else changes — the agent loop is generic over this registry.
 */
import "server-only";
import {
  getBreakouts,
  getRisingNiches,
  getSaturation,
  getTrending,
} from "@/lib/data";
import { enrichGame, enrichGames, type GameEnrichment } from "@/lib/enrich";
import { genreSlug } from "@/lib/format";
import { analyzeNiche } from "@/lib/niche";
import type { NicheAnalysisResult } from "@/lib/niche";
import { mapCompetitors } from "@/lib/competitors";
import type { CompetitorMapResult } from "@/lib/competitors";
import { analyzeIcon } from "@/lib/icon-analysis";
import type { IconAnalysisResult } from "@/lib/icon-analysis";
import { teardownMonetization } from "@/lib/monetization";
import type { MonetizationResult } from "@/lib/monetization";
import { analyzeGameQuality } from "@/lib/quality";
import type { GameQualityResult } from "@/lib/quality";
import { estimateRetention } from "@/lib/retention";
import type { RetentionResult } from "@/lib/retention";
import { estimateRevenue } from "@/lib/revenue";
import type { RevenueResult } from "@/lib/revenue";
import { pickGameMatch } from "@/lib/resolve-game";
import { getThumbnails } from "@/lib/thumbnails";
import { RobloxClient } from "@bloxscout/core/roblox-client";

// Re-export the niche-scan result types so the widget layer imports its props
// from the same place as the other tool results (type-only; erased at build).
export type { NicheAnalysisResult, NicheGameRow, NicheVerdict } from "@/lib/niche";
export type {
  RevenueResult,
  RevenueGame,
  RevenueAssumptions,
} from "@/lib/revenue";
export type { GameQualityResult, QualityBand } from "@/lib/quality";
export type {
  MonetizationResult,
  MonetizationPass,
  MonetizationStyle,
} from "@/lib/monetization";
export type { CompetitorMapResult, CompetitorRow } from "@/lib/competitors";
export type { RetentionResult, RetentionStep } from "@/lib/retention";
export type { IconAnalysisResult, IconTraits } from "@/lib/icon-analysis";
// Faithful per-game signal bundle attached to rows + returned by get_game_details.
export type { GameEnrichment, CcuPoint } from "@/lib/enrich";

/** A JSON-Schema-ish object the Anthropic SDK accepts as `input_schema`. */
type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

/** Anthropic tool definition (the wire shape passed in `tools`). */
export interface ClaudeToolDef {
  name: string;
  description: string;
  input_schema: JsonSchema;
}

/** A registered copilot tool: its Claude definition + its server executor. */
export interface CopilotTool {
  def: ClaudeToolDef;
  /**
   * Runs the tool. Returns a small JSON-serializable object that becomes both
   * (a) the `tool_result` fed back to Claude and (b) the props for the inline
   * widget. Must never throw — return `{ ok: false, ... }` on failure so the
   * model can narrate "data not available yet" instead of the loop dying.
   */
  execute(input: Record<string, unknown>): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Shared result shapes (also imported by the widget layer for prop typing)
// ---------------------------------------------------------------------------

/** One row in a ranking/trending widget. */
export interface RankRow {
  universeId: number;
  name: string | null;
  genre: string | null;
  playing: number;
  growth24hPct: number | null;
  growth7dPct: number | null;
  zScore24h: number | null;
  /** 150×150 game icon URL, or null when unavailable. */
  thumbnailUrl: string | null;
  /**
   * Faithful hosted signals (growth windows, CCU series, age, dev cadence,
   * favorites/visits). Present only for the top rows we enrich to control token
   * cost; `undefined` means "not available yet", never zero. Added additively
   * for the reasoning copilot.
   */
  enrichment?: GameEnrichment;
}

/** How many top ranking rows get the hosted-signal enrichment (token control). */
const ENRICH_TOP_N = 12;

export interface RankingResult {
  ok: boolean;
  kind: "trending" | "breakouts";
  title: string;
  generatedAt: string | null;
  rows: RankRow[];
  /** Honest empty-state copy when the young dataset has no rows yet. */
  note?: string;
}

export interface NicheGauge {
  genre: string;
  slug: string;
  saturationScore: number | null;
  whiteSpace: boolean;
  gameCount: number;
  totalPlaying: number;
  top1Share: number;
  top3Share: number;
  playersPerGame: number;
  reason: string | null;
}

export interface SaturationResult {
  ok: boolean;
  title: string;
  generatedAt: string | null;
  /** When a single genre was asked for, the focused card; else null. */
  focus: NicheGauge | null;
  /** A short leaderboard (most/least saturated) for context. */
  niches: NicheGauge[];
  note?: string;
}

export interface RisingRow {
  genre: string;
  slug: string;
  risingScore: number;
  growth24hPct: number | null;
  growth7dPct: number | null;
  saturationScore: number | null;
  durabilityBasis: "7d" | "24h-only";
}

export interface RisingResult {
  ok: boolean;
  title: string;
  generatedAt: string | null;
  rows: RisingRow[];
  note?: string;
}

/**
 * Everything known about ONE game, for a deep single-game dive: identity + live
 * stats + the faithful hosted enrichment (history, growth windows, age, dev
 * cadence, like-ratio WITH raw counts, favorites/visits). Every derived figure
 * is `null` when its source is thin — the model weights confidence itself.
 */
export interface GameDetailsResult {
  ok: boolean;
  universeId: number | null;
  name: string | null;
  genre: string | null;
  creatorName: string | null;
  /** Live concurrent players right now. `null` when the live fetch failed. */
  playing: number | null;
  /** Up-votes / down-votes / total / ratio (0..1). Counts let the model weight the ratio. */
  upVotes: number | null;
  downVotes: number | null;
  totalVotes: number | null;
  likeRatio: number | null;
  /** 150×150 game icon URL, or null when unavailable. */
  thumbnailUrl: string | null;
  /** Faithful hosted signals (growth windows, CCU series, age, cadence, favorites/visits). */
  enrichment: GameEnrichment | null;
  note?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shared live client for the single-game-details tool's identity/vote lookups. */
const roblox = new RobloxClient();

function clampLimit(input: unknown, fallback: number, max: number): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
}

function toRankRow(
  e: {
    universeId: number;
    name: string | null;
    genre: string | null;
    playing: number;
    growth24hPct: number | null;
    growth7dPct: number | null;
    zScore24h: number | null;
  },
  thumbnails: Map<number, string | null>,
): RankRow {
  return {
    universeId: e.universeId,
    name: e.name,
    genre: e.genre,
    playing: e.playing,
    growth24hPct: e.growth24hPct,
    growth7dPct: e.growth7dPct,
    zScore24h: e.zScore24h,
    thumbnailUrl: thumbnails.get(e.universeId) ?? null,
  };
}

/** One batched, cache()d icons fetch for a set of ranking rows. */
async function thumbsFor(
  entries: ReadonlyArray<{ universeId: number }>,
): Promise<Map<number, string | null>> {
  return getThumbnails(entries.map((e) => e.universeId));
}

/**
 * Attach the faithful hosted-signal enrichment to the top ranking rows (bounded
 * to ENRICH_TOP_N for token control). Rows beyond the cap are returned as-is so
 * the widget still shows them, just without the deep series.
 */
async function withEnrichment(rows: RankRow[]): Promise<RankRow[]> {
  if (rows.length === 0) return rows;
  const enrichment = await enrichGames(
    rows.map((r) => r.universeId),
    ENRICH_TOP_N,
  );
  return rows.map((r) => {
    const e = enrichment.get(r.universeId);
    return e ? { ...r, enrichment: e } : r;
  });
}

function toGauge(e: {
  genre: string;
  gameCount: number;
  totalPlaying: number;
  saturationScore: number | null;
  whiteSpace: boolean;
  components: {
    top1Share: number;
    top3Share: number;
    playersPerGame: number;
  };
  reason: string | null;
}): NicheGauge {
  return {
    genre: e.genre,
    slug: genreSlug(e.genre),
    saturationScore: e.saturationScore,
    whiteSpace: e.whiteSpace,
    gameCount: e.gameCount,
    totalPlaying: e.totalPlaying,
    top1Share: e.components.top1Share,
    top3Share: e.components.top3Share,
    playersPerGame: e.components.playersPerGame,
    reason: e.reason,
  };
}

const EMPTY_NOTE =
  "Rankings are still computing — the hosted dataset is young (history fills " +
  "in as 30-minute snapshots accumulate). Treat this as “not available yet,” " +
  "not zero.";

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const COPILOT_TOOLS: CopilotTool[] = [
  {
    def: {
      name: "get_trending_games",
      description:
        "Get the current top Roblox games ranked by live concurrent players " +
        "(CCU), with 24h/7d growth and an anomaly z-score. Call this when the " +
        "user asks what's popular, hot, trending, or biggest right now. " +
        "Returns a ranking that renders as an interactive table widget.",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "How many games to return (1-25). Default 10.",
          },
          genre: {
            type: "string",
            description:
              "Optional genre name to filter to (e.g. 'Tower Defense'). " +
              "Matched loosely by slug.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<RankingResult> {
      const limit = clampLimit(input.limit, 10, 25);
      const genre =
        typeof input.genre === "string" ? input.genre.trim() : "";
      const view = await getTrending();
      const base: RankingResult = {
        ok: Boolean(view),
        kind: "trending",
        title: genre ? `Trending — ${genre}` : "Trending games",
        generatedAt: view?.generatedAt ?? null,
        rows: [],
      };
      if (!view) return { ...base, note: EMPTY_NOTE };
      let entries = view.entries;
      if (genre) {
        const want = genreSlug(genre);
        entries = entries.filter(
          (e) => e.genre && genreSlug(e.genre) === want,
        );
      }
      const top = entries
        .slice()
        .sort((a, b) => b.playing - a.playing)
        .slice(0, limit);
      const thumbs = await thumbsFor(top);
      const rows = await withEnrichment(top.map((e) => toRankRow(e, thumbs)));
      return {
        ...base,
        rows,
        note: rows.length === 0 ? "No games matched that filter yet." : undefined,
      };
    },
  },

  {
    def: {
      name: "get_breakout_games",
      description:
        "Get games breaking out right now — the fastest accelerating titles " +
        "by recent growth and anomaly score, not just the biggest. Call this " +
        "when the user asks what's surging, blowing up, breaking out, or " +
        "gaining fastest. Renders as a ranking table widget.",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "How many games to return (1-25). Default 10.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<RankingResult> {
      const limit = clampLimit(input.limit, 10, 25);
      const view = await getBreakouts();
      let entries = view?.entries ?? [];
      let generatedAt = view?.generatedAt ?? null;
      let derived = false;

      // Defense-in-depth: the published breakouts view is z-score-based and
      // comes back empty on a young/gappy dataset (z-scores need several days
      // of history). When it's empty, derive breakouts from the trending view
      // re-ranked by 24h growth — the same growth fallback the pipeline uses —
      // so the agent always surfaces real accelerators instead of "no rows".
      if (entries.length === 0) {
        const trending = await getTrending();
        if (trending) {
          generatedAt = trending.generatedAt;
          entries = trending.entries
            .filter(
              (e) =>
                e.playing >= 300 &&
                e.growth24hPct !== null &&
                e.growth24hPct >= 30,
            )
            .slice()
            .sort((a, b) => (b.growth24hPct ?? 0) - (a.growth24hPct ?? 0));
          derived = entries.length > 0;
        }
      }

      if (entries.length === 0) {
        return {
          ok: false,
          kind: "breakouts",
          title: "Breakout games",
          generatedAt,
          rows: [],
          note: EMPTY_NOTE,
        };
      }

      const top = entries.slice(0, limit);
      const thumbs = await thumbsFor(top);
      return {
        ok: true,
        kind: "breakouts",
        title: "Breakout games",
        generatedAt,
        rows: await withEnrichment(top.map((e) => toRankRow(e, thumbs))),
        note: derived
          ? "Ranked by 24h growth; anomaly scoring sharpens this as more history accrues."
          : undefined,
      };
    },
  },

  {
    def: {
      name: "analyze_niche",
      description:
        "Analyze a SPECIFIC niche / sub-genre / game-type by name — e.g. " +
        "'tower defense', 'anime fighting', 'brainrot', 'tycoon', 'horror', " +
        "'simulator', 'obby'. Searches Roblox LIVE for matching games and " +
        "measures real competition from current player counts: how many games, " +
        "total live players, how dominant the top titles are (concentration), " +
        "and whether smaller games are getting traction (room to enter). " +
        "USE THIS for any specific niche question — 'is X saturated?', 'is " +
        "there room in X?', 'what should I build in X?' — and for any niche " +
        "phrase that is NOT one of Roblox's ~18 coarse official genres. Prefer " +
        "this over get_genre_saturation for anything more specific than a broad " +
        "genre. Works on live data (no history needed). Renders an interactive " +
        "niche-scan widget.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The niche / sub-genre / game-type to analyze, e.g. " +
              "'tower defense', 'anime fighting', 'tycoon'.",
          },
          limit: {
            type: "integer",
            description: "Max games to scan (1-50). Default 30.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    async execute(input): Promise<NicheAnalysisResult> {
      const query = typeof input.query === "string" ? input.query : "";
      const limit = typeof input.limit === "number" ? input.limit : undefined;
      return analyzeNiche(query, limit);
    },
  },

  {
    def: {
      name: "get_genre_saturation",
      description:
        "Assess how saturated/crowded a Roblox genre is (0-100, higher = more " +
        "saturated), or list the most/least saturated genres. Call this when " +
        "the user asks whether a niche is saturated, crowded, competitive, or " +
        "whether there's white space / room to enter. If they name a genre, " +
        "pass it as `genre` for a focused gauge card; otherwise returns a " +
        "leaderboard. Renders as a saturation 'NicheCard' with a gauge.",
      input_schema: {
        type: "object",
        properties: {
          genre: {
            type: "string",
            description:
              "Genre to focus on, e.g. 'Tower Defense', 'Simulator'. Omit to " +
              "rank all scored genres.",
          },
          limit: {
            type: "integer",
            description: "How many genres in the leaderboard (1-12). Default 6.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<SaturationResult> {
      const limit = clampLimit(input.limit, 6, 12);
      const genre =
        typeof input.genre === "string" ? input.genre.trim() : "";
      const view = await getSaturation();
      if (!view) {
        return {
          ok: false,
          title: genre ? `Saturation — ${genre}` : "Genre saturation",
          generatedAt: null,
          focus: null,
          niches: [],
          note: EMPTY_NOTE,
        };
      }
      const scored = view.entries
        // Drop the unlabeled/empty-genre bucket — showing "(blank) 66" is
        // noise, never a real answer.
        .filter((e) => e.saturationScore !== null && e.genre.trim() !== "")
        .sort((a, b) => (b.saturationScore ?? 0) - (a.saturationScore ?? 0));

      let focus: NicheGauge | null = null;
      if (genre) {
        const want = genreSlug(genre);
        const match = view.entries.find((e) => genreSlug(e.genre) === want);
        if (match) focus = toGauge(match);
      }
      return {
        ok: true,
        title: focus ? `Saturation — ${focus.genre}` : "Genre saturation",
        generatedAt: view.generatedAt,
        focus,
        niches: scored.slice(0, limit).map(toGauge),
        note:
          focus === null && genre
            ? `“${genre}” isn't scored yet (too little data) — showing the overall leaderboard.`
            : undefined,
      };
    },
  },

  {
    def: {
      name: "get_rising_niches",
      description:
        "Get rising Roblox genres/niches — momentum × opportunity × " +
        "durability, surfacing under-served categories that are growing. Call " +
        "this when the user asks what niches are rising, what's a good time to " +
        "enter, or 'what should I build' (use this to ground build ideas in " +
        "real momentum). Renders as a ranked opportunity list widget.",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "How many niches to return (1-12). Default 6.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<RisingResult> {
      const limit = clampLimit(input.limit, 6, 12);
      const view = await getRisingNiches();
      if (!view) {
        return {
          ok: false,
          title: "Rising niches",
          generatedAt: null,
          rows: [],
          note: EMPTY_NOTE,
        };
      }
      const rows = view.entries
        .slice()
        .sort((a, b) => b.risingScore - a.risingScore)
        .slice(0, limit)
        .map((e) => ({
          genre: e.genre,
          slug: genreSlug(e.genre),
          risingScore: e.risingScore,
          growth24hPct: e.growth24hPct,
          growth7dPct: e.growth7dPct,
          saturationScore: e.saturationScore,
          durabilityBasis: e.durabilityBasis,
        }));
      return {
        ok: true,
        title: "Rising niches",
        generatedAt: view.generatedAt,
        rows,
      };
    },
  },

  {
    def: {
      name: "estimate_revenue",
      description:
        "Estimate Roblox game revenue in USD. Call this when the user asks how " +
        "much a game makes/earns, what a niche or genre is worth, or which " +
        "genres are most profitable. Three modes: pass `gameName` or " +
        "`universeId` for a SINGLE game's monthly estimate (live CCU × a " +
        "platform-average monetization heuristic); pass `genre` for that " +
        "genre's earning aggregate; pass nothing for a top-earning-genres " +
        "leaderboard. The figure is a HEURISTIC that varies 5-10x by " +
        "monetization design — ALWAYS lead with the disclaimer the result " +
        "carries; never present it as precise. Renders a revenue card widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description:
              "A game's name to estimate (e.g. 'Grow a Garden'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "A game's Roblox universe id (alternative to gameName).",
          },
          genre: {
            type: "string",
            description:
              "A genre to estimate (e.g. 'Simulator'). Omit gameName/universeId.",
          },
          limit: {
            type: "integer",
            description: "Leaderboard size for genre/leaderboard mode (1-12). Default 6.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<RevenueResult> {
      return estimateRevenue({
        gameName:
          typeof input.gameName === "string" ? input.gameName : undefined,
        universeId:
          typeof input.universeId === "number" ? input.universeId : undefined,
        genre: typeof input.genre === "string" ? input.genre : undefined,
        limit: typeof input.limit === "number" ? input.limit : undefined,
      });
    },
  },

  {
    def: {
      name: "get_game_quality",
      description:
        "Measure a game's QUALITY (not popularity) from its like-ratio — the " +
        "share of up-votes among all votes. Call this when the user asks if a " +
        "game is good, well-reviewed, well-liked, or how players rate it. " +
        "Quality is distinct from CCU: a huge game can be divisive, a small one " +
        "beloved — never infer quality from player count. Pass `gameName` or " +
        "`universeId`. Returns up/down votes, like-ratio, and a band " +
        "(loved/mixed/poor). Renders a quality gauge widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description: "A game's name (e.g. 'Blox Fruits'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "A game's Roblox universe id (alternative to gameName).",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<GameQualityResult> {
      return analyzeGameQuality({
        gameName:
          typeof input.gameName === "string" ? input.gameName : undefined,
        universeId:
          typeof input.universeId === "number" ? input.universeId : undefined,
      });
    },
  },

  {
    def: {
      name: "teardown_monetization",
      description:
        "Tear down how a game makes money — its gamepass pricing ladder, how " +
        "many passes it sells, the price range, and its monetization style " +
        "(gamepass-heavy / gamepass-light / none). Call this when the user asks " +
        "how a game monetizes, what it charges, what gamepasses it has, or " +
        "what to price their own game at by example. Pass `gameName` or " +
        "`universeId`. NOTE: covers gamepasses only — developer products aren't " +
        "publicly listable, so say the picture may be larger. Renders a " +
        "monetization teardown widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description: "A game's name (e.g. 'Blox Fruits'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "A game's Roblox universe id (alternative to gameName).",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<MonetizationResult> {
      return teardownMonetization({
        gameName:
          typeof input.gameName === "string" ? input.gameName : undefined,
        universeId:
          typeof input.universeId === "number" ? input.universeId : undefined,
      });
    },
  },

  {
    def: {
      name: "map_competitors",
      description:
        "Map a game's real competitors using Roblox's OWN recommendations " +
        "graph — the games the platform itself treats as adjacent, each with " +
        "its live players and like-ratio. Call this when the user asks who " +
        "competes with a game, what games are similar to it, or who the rivals " +
        "in its space are. More authoritative than a keyword search because " +
        "it's Roblox's actual 'players who like X also play' graph. Pass " +
        "`gameName` or `universeId`. Renders a competitor map widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description: "The anchor game's name (e.g. 'Blox Fruits'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "The anchor game's universe id (alternative to gameName).",
          },
          limit: {
            type: "integer",
            description: "How many competitors to map (1-25). Default 12.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<CompetitorMapResult> {
      return mapCompetitors({
        gameName:
          typeof input.gameName === "string" ? input.gameName : undefined,
        universeId:
          typeof input.universeId === "number" ? input.universeId : undefined,
        limit: typeof input.limit === "number" ? input.limit : undefined,
      });
    },
  },

  {
    def: {
      name: "estimate_retention",
      description:
        "Estimate how well players stick with / progress through a game, using " +
        "a PROXY built from its milestone badges' award counts (the ratio of " +
        "awards between sequential milestones ≈ a progression-through funnel). " +
        "Call this when the user asks about retention, stickiness, drop-off, or " +
        "how far players get. Pass `gameName` or `universeId`. This is a ROUGH, " +
        "very-low-confidence proxy that depends on the dev shipping meaningful " +
        "badges — if a game has none, say so and stress that absence of badges " +
        "is NOT evidence of poor retention. Never present it as true D1/D7 " +
        "retention. Renders a retention funnel widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description: "A game's name (e.g. 'Blox Fruits'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "A game's Roblox universe id (alternative to gameName).",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<RetentionResult> {
      return estimateRetention({
        gameName:
          typeof input.gameName === "string" ? input.gameName : undefined,
        universeId:
          typeof input.universeId === "number" ? input.universeId : undefined,
      });
    },
  },

  {
    def: {
      name: "analyze_icon",
      description:
        "Analyze a game's ICON/thumbnail art direction using vision — its " +
        "colour palette, focal subject, whether it uses text/a face, contrast, " +
        "and style — then give concrete suggestions to improve it. Call this " +
        "when the user asks about their icon, thumbnail, art, or how to make a " +
        "game stand out visually in search/discovery. Pass `gameName` or " +
        "`universeId`. NOTE: this is a paid (Pro) feature — if it returns a " +
        "locked result, tell the user icon analysis is on the Pro plan; don't " +
        "fabricate an analysis. Renders an icon-analysis widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description: "A game's name (e.g. 'Blox Fruits'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "A game's Roblox universe id (alternative to gameName).",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<IconAnalysisResult> {
      return analyzeIcon({
        gameName:
          typeof input.gameName === "string" ? input.gameName : undefined,
        universeId:
          typeof input.universeId === "number" ? input.universeId : undefined,
      });
    },
  },

  {
    def: {
      name: "get_game_details",
      description:
        "Get EVERYTHING known about ONE game in a single call — its identity, " +
        "live CCU, like-ratio with raw up/down vote counts, plus the faithful " +
        "hosted signals: 24h/7d/30d CCU growth, a compact CCU history series, " +
        "game age, dev update cadence, and favorites/visits engagement. Call " +
        "this for a deep dive on a specific named game ('tell me about <game>', " +
        "'how is <game> doing?', 'is <game> growing or fading?') when you want " +
        "the full picture rather than one slice. Many figures are null when the " +
        "hosted history is thin — reason from what's present, say 'not enough " +
        "data yet' for the rest. Pass `gameName` or `universeId`. Renders a " +
        "game-details widget.",
      input_schema: {
        type: "object",
        properties: {
          gameName: {
            type: "string",
            description: "A game's name (e.g. 'Grow a Garden'). Resolved live.",
          },
          universeId: {
            type: "integer",
            description: "A game's Roblox universe id (alternative to gameName).",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(input): Promise<GameDetailsResult> {
      const gameName =
        typeof input.gameName === "string" ? input.gameName.trim() : "";
      const universeIdIn =
        typeof input.universeId === "number" ? input.universeId : undefined;

      const base: GameDetailsResult = {
        ok: false,
        universeId: null,
        name: null,
        genre: null,
        creatorName: null,
        playing: null,
        upVotes: null,
        downVotes: null,
        totalVotes: null,
        likeRatio: null,
        thumbnailUrl: null,
        enrichment: null,
      };

      // Resolve to a concrete universe + live game record.
      let universeId: number | null = null;
      let name: string | null = null;
      let genre: string | null = null;
      let creatorName: string | null = null;
      let playing: number | null = null;
      let fbUp: number | null = null;
      let fbDown: number | null = null;

      try {
        if (universeIdIn && universeIdIn > 0) {
          universeId = universeIdIn;
          const [g] = await roblox.getGames([universeIdIn]);
          if (g) {
            name = g.name;
            genre = g.genre || null;
            creatorName = g.creator?.name ?? null;
            playing = g.playing;
          }
        } else if (gameName) {
          const matches = await roblox.searchGames(gameName, { limit: 5 });
          const m = pickGameMatch(gameName, matches);
          if (m) {
            universeId = m.universeId;
            name = m.name;
            creatorName = m.creatorName || null;
            playing = typeof m.playerCount === "number" ? m.playerCount : null;
            fbUp = typeof m.totalUpVotes === "number" ? m.totalUpVotes : null;
            fbDown =
              typeof m.totalDownVotes === "number" ? m.totalDownVotes : null;
            // Pull full detail for genre + authoritative live CCU.
            const [g] = await roblox.getGames([m.universeId]);
            if (g) {
              genre = g.genre || null;
              playing = g.playing;
              creatorName = g.creator?.name ?? creatorName;
            }
          }
        }
      } catch {
        // fall through to the not-found path below
      }

      if (universeId === null) {
        return {
          ...base,
          note: gameName
            ? "Couldn't find that game on Roblox right now. Check the name, or pass a universe id."
            : "Pass a game name or a universe id.",
        };
      }

      // Votes (precise endpoint, with the search-row totals as fallback) +
      // thumbnail + the faithful hosted enrichment, all in parallel.
      const [votes, thumbs, enrichment] = await Promise.all([
        roblox.getGameVotes([universeId]).catch(() => []),
        getThumbnails([universeId]),
        enrichGame(universeId),
      ]);

      let up: number | null = votes[0]?.upVotes ?? null;
      let down: number | null = votes[0]?.downVotes ?? null;
      if (up === null && fbUp !== null && fbDown !== null) {
        up = fbUp;
        down = fbDown;
      }
      up = up === null ? null : Math.max(0, up);
      down = down === null ? null : Math.max(0, down);
      const totalVotes = up !== null && down !== null ? up + down : null;
      const likeRatio =
        totalVotes !== null && totalVotes > 0 && up !== null
          ? up / totalVotes
          : null;

      return {
        ok: true,
        universeId,
        name,
        genre,
        creatorName,
        playing,
        upVotes: up,
        downVotes: down,
        totalVotes,
        likeRatio,
        thumbnailUrl: thumbs.get(universeId) ?? null,
        enrichment,
        note: enrichment.thinHistory
          ? "No tracked history yet, so growth windows and the CCU series are unavailable for this game."
          : undefined,
      };
    },
  },
];

/** Map for O(1) executor lookup in the agent loop. */
export const TOOL_BY_NAME = new Map<string, CopilotTool>(
  COPILOT_TOOLS.map((t) => [t.def.name, t]),
);

/** The wire-shape definitions handed to the Anthropic SDK. */
export const CLAUDE_TOOL_DEFS: ClaudeToolDef[] = COPILOT_TOOLS.map((t) => t.def);
