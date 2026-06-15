/**
 * Retention / progression proxy for the AI agent — answers "do players stick
 * with <game>?" / "how far do players get?". There's no public retention API,
 * so this approximates a funnel from BADGE award counts: badges are dev-defined
 * milestones, and the ratio of awards between sequential milestones is a
 * progression-through rate. Where all-time visits are known, each badge's
 * awards-as-share-of-visits is a rough reach figure.
 *
 * This is a PROXY, not classic D1/D7 retention — it depends entirely on the
 * dev shipping meaningful milestone badges. Confidence is "very-low" and the
 * result says so; a game with no usable badges returns an honest ok:false.
 *
 * SERVER-ONLY: uses `@bloxscout/core`'s RobloxClient. Never throws.
 */
import "server-only";
import { cache } from "react";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { getThumbnails } from "@/lib/thumbnails";

const roblox = new RobloxClient();

export interface RetentionStep {
  badgeName: string;
  awardedCount: number;
  /** awardedCount / all-time visits, 0..1; null when visits are unknown. */
  pctOfVisits: number | null;
  /** awardedCount / the most-earned badge's count, 0..1 — progression-through. */
  shareOfTop: number;
}

export interface RetentionResult {
  ok: boolean;
  universeId: number | null;
  name: string | null;
  visits: number | null;
  badgeCount: number;
  funnel: RetentionStep[];
  thumbnailUrl: string | null;
  confidence: "very-low";
  note?: string;
}

export interface RetentionInput {
  universeId?: number;
  gameName?: string;
}

const FUNNEL_SIZE = 6;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

interface Target {
  universeId: number;
  name: string | null;
  visits: number | null;
}

async function resolveTarget(input: RetentionInput): Promise<Target | null> {
  let universeId: number | null = null;
  if (typeof input.universeId === "number" && input.universeId > 0) {
    universeId = input.universeId;
  } else {
    const q = (input.gameName ?? "").trim();
    if (!q) return null;
    try {
      const matches = await roblox.searchGames(q, { limit: 5 });
      universeId = matches[0]?.universeId ?? null;
    } catch {
      return null;
    }
  }
  if (universeId === null) return null;
  // Enrich with name + all-time visits (one detail fetch).
  try {
    const [g] = await roblox.getGames([universeId]);
    if (g) return { universeId, name: g.name, visits: Math.max(0, g.visits) };
  } catch {
    // fall through — funnel still works without visits
  }
  return { universeId, name: null, visits: null };
}

/**
 * Estimate a progression funnel from badge award counts. Never throws.
 */
export const estimateRetention = cache(
  async (input: RetentionInput): Promise<RetentionResult> => {
    const base: RetentionResult = {
      ok: false,
      universeId: null,
      name: null,
      visits: null,
      badgeCount: 0,
      funnel: [],
      thumbnailUrl: null,
      confidence: "very-low",
    };

    const t = await resolveTarget(input);
    if (!t) {
      return {
        ...base,
        note: "Couldn't find that game on Roblox right now. Check the name, or pass a universe id.",
      };
    }

    let badges: Awaited<ReturnType<RobloxClient["getUniverseBadges"]>>;
    try {
      badges = await roblox.getUniverseBadges(t.universeId, { limit: 100 });
    } catch {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        visits: t.visits,
        note: "Roblox's badge endpoint isn't responding for this game right now.",
      };
    }

    const usable = badges.filter((b) => b.enabled && b.awardedCount > 0);
    const thumbs = await getThumbnails([t.universeId]);
    const thumbnailUrl = thumbs.get(t.universeId) ?? null;

    if (usable.length === 0) {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        visits: t.visits,
        thumbnailUrl,
        note: `${t.name ?? "This game"} doesn't ship milestone badges with award stats, so a badge-based progression proxy isn't available. Absence of badges is NOT evidence of poor retention — many strong games simply don't use them.`,
      };
    }

    // Already sorted by awardedCount desc in the client; the top badge is the
    // earliest/most-reached milestone and anchors the funnel.
    const top = usable[0].awardedCount;
    const funnel: RetentionStep[] = usable.slice(0, FUNNEL_SIZE).map((b) => ({
      badgeName: b.name || "Unnamed badge",
      awardedCount: b.awardedCount,
      pctOfVisits:
        t.visits && t.visits > 0 ? clamp01(b.awardedCount / t.visits) : null,
      shareOfTop: top > 0 ? clamp01(b.awardedCount / top) : 0,
    }));

    return {
      ok: true,
      universeId: t.universeId,
      name: t.name,
      visits: t.visits,
      badgeCount: usable.length,
      funnel,
      thumbnailUrl,
      confidence: "very-low",
      note: "Progression proxy from dev-defined badge milestones — not classic D1/D7 retention. Treat as directional only.",
    };
  },
);
