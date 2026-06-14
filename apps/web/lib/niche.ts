/**
 * Live niche analysis — answers "is <niche> saturated?" / "what should I build
 * in <niche>?" for ANY niche the user names (tower defense, anime fighting,
 * brainrot, tycoon…), NOT just Roblox's ~18 coarse official genres.
 *
 * How: search Roblox live (omni-search) for games matching the niche phrase,
 * build that cohort from their CURRENT player counts, and compute real
 * competition — count, total demand, how dominant the top titles are
 * (concentration / HHI), and whether smaller games are getting traction (the
 * "room to enter" signal). This runs on live data, so it works today despite
 * the hosted dataset's thin history.
 *
 * SERVER-ONLY: uses `@bloxscout/core`'s RobloxClient (undici).
 */
import "server-only";
import { cache } from "react";
import { herfindahlIndex, topNShare } from "@bloxscout/core/concentration";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { getThumbnails } from "@/lib/thumbnails";

const roblox = new RobloxClient();

/** A game in the niche cohort. */
export interface NicheGameRow {
  universeId: number;
  name: string;
  playing: number;
  creatorName: string | null;
  /** Share of the niche's total live CCU, 0..1. */
  share: number;
  /** One-line game description (from the live search result; may be empty). */
  description: string;
  /** 150×150 game icon URL, or null when unavailable. */
  thumbnailUrl: string | null;
}

/** open = room to win · contested = a few big players · locked = one game owns it · thin = no real market. */
export type NicheVerdict = "open" | "contested" | "locked" | "thin";

export interface NicheAnalysisResult {
  ok: boolean;
  query: string;
  title: string;
  /** Games matched for the niche. */
  gameCount: number;
  /** Summed live CCU across the cohort. */
  totalPlaying: number;
  /** Share of CCU held by the single biggest game, 0..1. */
  top1Share: number;
  /** Share of CCU held by the top 3 games, 0..1. */
  top3Share: number;
  /** Herfindahl concentration index, 0..1. */
  hhi: number;
  /** 0..100, higher = more locked-up / harder to break into. */
  saturationScore: number;
  verdict: NicheVerdict;
  /** Real demand + fragmented top + smaller games getting traction. */
  whiteSpace: boolean;
  /** Top games by live CCU. */
  leaders: NicheGameRow[];
  /** Games beyond the top 3 still holding meaningful CCU (entry-room signal). */
  tailGames: number;
  /** Honest caveat shown to the model + user. */
  note?: string;
}

// A niche needs at least this many games / this much total demand to be
// scored as a real market rather than "thin".
const MIN_GAMES = 4;
const MIN_DEMAND = 1500;
// A non-leader game above this CCU counts as live competition (entry-room).
const MIN_TAIL_CCU = 75;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Trim a Roblox description to a single tidy line for the widget row. */
function oneLine(description: string | null | undefined): string {
  return (description ?? "").replace(/\s+/g, " ").trim();
}

function toRow(
  g: {
    universeId: number;
    name: string;
    playerCount: number;
    creatorName: string;
    description?: string;
  },
  total: number,
  thumbnails: Map<number, string | null>,
): NicheGameRow {
  const playing = Math.max(0, g.playerCount);
  return {
    universeId: g.universeId,
    name: g.name,
    playing,
    creatorName: g.creatorName ?? null,
    share: total > 0 ? playing / total : 0,
    description: oneLine(g.description),
    thumbnailUrl: thumbnails.get(g.universeId) ?? null,
  };
}

/**
 * Analyze a niche by live-searching Roblox for matching games and measuring
 * competition. Never throws — returns `ok:false` + a `note` on any failure or
 * thin market so the copilot can answer honestly.
 */
export const analyzeNiche = cache(
  async (query: string, limit?: number): Promise<NicheAnalysisResult> => {
    const q = (query ?? "").trim();
    const cap = Math.max(
      1,
      Math.min(MAX_LIMIT, Math.round(Number(limit) || DEFAULT_LIMIT)),
    );
    const base: NicheAnalysisResult = {
      ok: false,
      query: q,
      title: q ? `${q} — niche scan` : "Niche scan",
      gameCount: 0,
      totalPlaying: 0,
      top1Share: 0,
      top3Share: 0,
      hhi: 0,
      saturationScore: 0,
      verdict: "thin",
      whiteSpace: false,
      leaders: [],
      tailGames: 0,
    };
    if (!q) return { ...base, note: "No niche specified." };

    let games: Awaited<ReturnType<RobloxClient["searchGames"]>>;
    try {
      games = await roblox.searchGames(q, { limit: cap });
    } catch {
      return {
        ...base,
        note: "Live Roblox search is unavailable right now — try again shortly.",
      };
    }

    const ranked = games
      .filter((g) => Number.isFinite(g.playerCount))
      .sort((a, b) => b.playerCount - a.playerCount);
    const ccus = ranked.map((g) => Math.max(0, g.playerCount));
    const totalPlaying = ccus.reduce((s, n) => s + n, 0);
    const gameCount = ranked.length;

    if (gameCount < MIN_GAMES || totalPlaying < MIN_DEMAND) {
      const thinLeaders = ranked.slice(0, 6);
      const thinThumbs = await getThumbnails(
        thinLeaders.map((g) => g.universeId),
      );
      return {
        ...base,
        gameCount,
        totalPlaying,
        leaders: thinLeaders.map((g) => toRow(g, totalPlaying, thinThumbs)),
        note:
          gameCount === 0
            ? `No live games matched "${q}". Try a broader phrasing, or it may not be an established niche on Roblox.`
            : `Thin market: only ${gameCount} live games / ${totalPlaying.toLocaleString()} players match "${q}" right now — nascent, or not yet a real niche. That can mean genuine white space OR no proven demand; weigh it against a rising-niche check.`,
      };
    }

    const top1Share = topNShare(ccus, 1);
    const top3Share = topNShare(ccus, 3);
    const hhi = herfindahlIndex(ccus);
    const tailGames = ccus.slice(3).filter((c) => c >= MIN_TAIL_CCU).length;
    const saturationScore = Math.round(
      100 * clamp01(0.55 * top1Share + 0.25 * top3Share + 0.2 * hhi),
    );
    const verdict: NicheVerdict =
      top1Share >= 0.6 ? "locked" : top3Share >= 0.75 ? "contested" : "open";
    const whiteSpace = verdict === "open" && tailGames >= 3;

    const topLeaders = ranked.slice(0, 8);
    const thumbnails = await getThumbnails(
      topLeaders.map((g) => g.universeId),
    );

    return {
      ok: true,
      query: q,
      title: `${q} — niche scan`,
      gameCount,
      totalPlaying,
      top1Share,
      top3Share,
      hhi,
      saturationScore,
      verdict,
      whiteSpace,
      leaders: topLeaders.map((g) => toRow(g, totalPlaying, thumbnails)),
      tailGames,
    };
  },
);
