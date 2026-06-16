/**
 * Game quality signal for the AI agent — answers "is <game> any good / well
 * reviewed?". Quality ≠ popularity: a game can have huge CCU and a mediocre
 * like-ratio, or be small and beloved. This reads the up/down vote ratio, the
 * cheapest quality proxy Roblox exposes unauthenticated.
 *
 * Source priority: the dedicated `/v1/games/votes` endpoint (precise), falling
 * back to the `totalUpVotes`/`totalDownVotes` already present on omni-search
 * rows so the tool degrades instead of dying when `/votes` is unreachable.
 *
 * SERVER-ONLY: uses `@bloxscout/core`'s RobloxClient. Never throws — returns
 * `ok:false` + a `note` so the copilot answers honestly.
 */
import "server-only";
import { cache } from "react";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { pickGameMatch } from "@/lib/resolve-game";
import { getThumbnails } from "@/lib/thumbnails";

const roblox = new RobloxClient();

/** loved = strongly liked · mixed = divisive · poor = disliked. */
export type QualityBand = "loved" | "mixed" | "poor";

export interface GameQualityResult {
  ok: boolean;
  universeId: number | null;
  name: string | null;
  upVotes: number;
  downVotes: number;
  totalVotes: number;
  /** upVotes / (upVotes + downVotes), 0..1; null when there are no votes. */
  likeRatio: number | null;
  qualityBand: QualityBand | null;
  /** True when the ratio came from search-row totals (the /votes fallback). */
  approximate: boolean;
  thumbnailUrl: string | null;
  note?: string;
}

export interface GameQualityInput {
  universeId?: number;
  gameName?: string;
}

// Ratio thresholds for the quality bands.
const LOVED = 0.85;
const MIXED = 0.65;
// Below this many votes the ratio is statistically noisy — still shown, but
// flagged in the note.
const MIN_VOTES = 50;

function bandFor(ratio: number): QualityBand {
  if (ratio >= LOVED) return "loved";
  if (ratio >= MIXED) return "mixed";
  return "poor";
}

interface Target {
  universeId: number;
  name: string | null;
  /** Fallback vote totals from the search row (when available). */
  fbUp: number | null;
  fbDown: number | null;
}

async function resolveTarget(input: GameQualityInput): Promise<Target | null> {
  if (typeof input.universeId === "number" && input.universeId > 0) {
    let name: string | null = null;
    try {
      const [g] = await roblox.getGames([input.universeId]);
      if (g) name = g.name;
    } catch {
      // name stays null — votes can still resolve by id
    }
    return { universeId: input.universeId, name, fbUp: null, fbDown: null };
  }

  const q = (input.gameName ?? "").trim();
  if (!q) return null;
  let matches: Awaited<ReturnType<RobloxClient["searchGames"]>>;
  try {
    matches = await roblox.searchGames(q, { limit: 5 });
  } catch {
    return null;
  }
  const m = pickGameMatch(q, matches);
  if (!m) return null;
  return {
    universeId: m.universeId,
    name: m.name,
    fbUp: typeof m.totalUpVotes === "number" ? m.totalUpVotes : null,
    fbDown: typeof m.totalDownVotes === "number" ? m.totalDownVotes : null,
  };
}

/**
 * Resolve a game's like-ratio quality signal. Never throws.
 */
export const analyzeGameQuality = cache(
  async (input: GameQualityInput): Promise<GameQualityResult> => {
    const base: GameQualityResult = {
      ok: false,
      universeId: null,
      name: null,
      upVotes: 0,
      downVotes: 0,
      totalVotes: 0,
      likeRatio: null,
      qualityBand: null,
      approximate: false,
      thumbnailUrl: null,
    };

    const t = await resolveTarget(input);
    if (!t) {
      return {
        ...base,
        note: "Couldn't find that game on Roblox right now. Check the name, or pass a universe id.",
      };
    }

    let up: number | null = null;
    let down: number | null = null;
    let approximate = false;
    try {
      const [v] = await roblox.getGameVotes([t.universeId]);
      if (v) {
        up = v.upVotes;
        down = v.downVotes;
      }
    } catch {
      // fall through to the search-row fallback
    }
    if (up === null && t.fbUp !== null && t.fbDown !== null) {
      up = t.fbUp;
      down = t.fbDown;
      approximate = true;
    }

    const thumbs = await getThumbnails([t.universeId]);
    const thumbnailUrl = thumbs.get(t.universeId) ?? null;

    if (up === null || down === null) {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        thumbnailUrl,
        note: "Vote data isn't available for this game right now.",
      };
    }

    up = Math.max(0, up);
    down = Math.max(0, down);
    const totalVotes = up + down;
    if (totalVotes === 0) {
      return {
        ok: true,
        universeId: t.universeId,
        name: t.name,
        upVotes: up,
        downVotes: down,
        totalVotes: 0,
        likeRatio: null,
        qualityBand: null,
        approximate,
        thumbnailUrl,
        note: "No votes yet — too early to judge quality.",
      };
    }

    const likeRatio = up / totalVotes;
    return {
      ok: true,
      universeId: t.universeId,
      name: t.name,
      upVotes: up,
      downVotes: down,
      totalVotes,
      likeRatio,
      qualityBand: bandFor(likeRatio),
      approximate,
      thumbnailUrl,
      note:
        totalVotes < MIN_VOTES
          ? `Only ${totalVotes} vote(s) so far — the ratio is still noisy.`
          : approximate
            ? "Ratio from search totals (live vote endpoint was unavailable)."
            : undefined,
    };
  },
);
