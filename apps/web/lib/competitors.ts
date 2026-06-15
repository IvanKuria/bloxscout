/**
 * Competitor mapping for the AI agent — answers "who competes with <game>?" /
 * "what are the games like <game>?". Built on Roblox's OWN recommendations
 * graph, so it reflects what the platform actually treats as adjacent — not a
 * keyword guess. Each neighbour arrives with live CCU + vote totals inline, so
 * one request yields a ranked competitor table with quality baked in.
 *
 * SERVER-ONLY: uses `@bloxscout/core`'s RobloxClient. Never throws — returns
 * `ok:false` + a `note` so the copilot answers honestly.
 */
import "server-only";
import { cache } from "react";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { getThumbnails } from "@/lib/thumbnails";

const roblox = new RobloxClient();

export interface CompetitorRow {
  universeId: number;
  name: string;
  playing: number;
  /** upVotes / (upVotes + downVotes), 0..1; null when there are no votes. */
  likeRatio: number | null;
  totalVotes: number;
  creatorName: string | null;
  genre: string | null;
  thumbnailUrl: string | null;
}

export interface CompetitorMapResult {
  ok: boolean;
  universeId: number | null;
  anchorName: string | null;
  /** Summed live CCU across the mapped competitors. */
  totalPlaying: number;
  rows: CompetitorRow[];
  note?: string;
}

export interface MapCompetitorsInput {
  universeId?: number;
  gameName?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;

interface Anchor {
  universeId: number;
  name: string | null;
}

async function resolveAnchor(input: MapCompetitorsInput): Promise<Anchor | null> {
  if (typeof input.universeId === "number" && input.universeId > 0) {
    let name: string | null = null;
    try {
      const [g] = await roblox.getGames([input.universeId]);
      if (g) name = g.name;
    } catch {
      // name stays null — recommendations resolve by id regardless
    }
    return { universeId: input.universeId, name };
  }
  const q = (input.gameName ?? "").trim();
  if (!q) return null;
  try {
    const matches = await roblox.searchGames(q, { limit: 5 });
    const m = matches[0];
    if (!m) return null;
    return { universeId: m.universeId, name: m.name };
  } catch {
    return null;
  }
}

/**
 * Map a game's competitors via Roblox's recommendations graph. Never throws.
 */
export const mapCompetitors = cache(
  async (input: MapCompetitorsInput): Promise<CompetitorMapResult> => {
    const base: CompetitorMapResult = {
      ok: false,
      universeId: null,
      anchorName: null,
      totalPlaying: 0,
      rows: [],
    };

    const anchor = await resolveAnchor(input);
    if (!anchor) {
      return {
        ...base,
        note: "Couldn't find that game on Roblox right now. Check the name, or pass a universe id.",
      };
    }

    const cap = Math.max(
      1,
      Math.min(MAX_LIMIT, Math.round(Number(input.limit) || DEFAULT_LIMIT)),
    );
    let recs: Awaited<ReturnType<RobloxClient["getRecommendations"]>>;
    try {
      recs = await roblox.getRecommendations(anchor.universeId, { maxRows: cap });
    } catch {
      return {
        ...base,
        universeId: anchor.universeId,
        anchorName: anchor.name,
        note: "Roblox's recommendations graph is unavailable right now — try again shortly.",
      };
    }

    if (recs.length === 0) {
      return {
        ...base,
        universeId: anchor.universeId,
        anchorName: anchor.name,
        note: `No recommendation neighbours for ${anchor.name ?? "this game"} yet — it may be too new or too niche for Roblox's graph.`,
      };
    }

    const sorted = recs
      .slice()
      .sort((a, b) => b.playerCount - a.playerCount)
      .slice(0, cap);
    const thumbs = await getThumbnails(sorted.map((r) => r.universeId));

    const rows: CompetitorRow[] = sorted.map((r) => {
      const up = Math.max(0, r.totalUpVotes);
      const down = Math.max(0, r.totalDownVotes);
      const totalVotes = up + down;
      return {
        universeId: r.universeId,
        name: r.name,
        playing: Math.max(0, r.playerCount),
        likeRatio: totalVotes > 0 ? up / totalVotes : null,
        totalVotes,
        creatorName: r.creatorName || null,
        genre: r.genre || null,
        thumbnailUrl: thumbs.get(r.universeId) ?? null,
      };
    });

    return {
      ok: true,
      universeId: anchor.universeId,
      anchorName: anchor.name,
      totalPlaying: rows.reduce((s, r) => s + r.playing, 0),
      rows,
    };
  },
);
