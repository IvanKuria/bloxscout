/**
 * Monetization teardown for the AI agent — answers "how does <game> make
 * money?" / "what should I charge?". Reads a game's gamepass catalog live and
 * summarises the pricing ladder + monetization style, so a dev can see how the
 * leaders in their niche actually price.
 *
 * Scope: gamepasses only. Developer-product listing requires Open Cloud auth
 * (the public endpoint 404s unauthenticated), so it's deferred — the result is
 * explicit that this is the gamepass picture, not the full monetization stack.
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

/** gamepass-heavy = a full pass ladder · gamepass-light = a few · none = no passes for sale. */
export type MonetizationStyle = "gamepass-heavy" | "gamepass-light" | "none";

export interface MonetizationPass {
  id: number;
  name: string;
  /** Robux, or null when off-sale. */
  price: number | null;
}

export interface MonetizationResult {
  ok: boolean;
  universeId: number | null;
  name: string | null;
  thumbnailUrl: string | null;
  /** Total passes returned. */
  passCount: number;
  /** Passes currently for sale (price !== null). */
  forSaleCount: number;
  priceMin: number | null;
  priceMax: number | null;
  priceMedian: number | null;
  style: MonetizationStyle;
  /** Top passes by price for the widget ladder. */
  passes: MonetizationPass[];
  note?: string;
}

export interface TeardownInput {
  universeId?: number;
  gameName?: string;
}

// A game with at least this many for-sale passes reads as "gamepass-heavy".
const HEAVY_THRESHOLD = 4;
const LADDER_SIZE = 8;

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

interface Target {
  universeId: number;
  name: string | null;
}

async function resolveTarget(input: TeardownInput): Promise<Target | null> {
  if (typeof input.universeId === "number" && input.universeId > 0) {
    let name: string | null = null;
    try {
      const [g] = await roblox.getGames([input.universeId]);
      if (g) name = g.name;
    } catch {
      // name stays null — passes resolve by id regardless
    }
    return { universeId: input.universeId, name };
  }
  const q = (input.gameName ?? "").trim();
  if (!q) return null;
  try {
    const matches = await roblox.searchGames(q, { limit: 5 });
    const m = pickGameMatch(q, matches);
    if (!m) return null;
    return { universeId: m.universeId, name: m.name };
  } catch {
    return null;
  }
}

/**
 * Tear down a game's gamepass monetization. Never throws.
 */
export const teardownMonetization = cache(
  async (input: TeardownInput): Promise<MonetizationResult> => {
    const base: MonetizationResult = {
      ok: false,
      universeId: null,
      name: null,
      thumbnailUrl: null,
      passCount: 0,
      forSaleCount: 0,
      priceMin: null,
      priceMax: null,
      priceMedian: null,
      style: "none",
      passes: [],
    };

    const t = await resolveTarget(input);
    if (!t) {
      return {
        ...base,
        note: "Couldn't find that game on Roblox right now. Check the name, or pass a universe id.",
      };
    }

    let passes: Awaited<ReturnType<RobloxClient["getGamePasses"]>>;
    try {
      passes = await roblox.getGamePasses(t.universeId);
    } catch {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        note: "Roblox's gamepass catalog endpoint isn't responding for this game right now.",
      };
    }

    const thumbs = await getThumbnails([t.universeId]);
    const thumbnailUrl = thumbs.get(t.universeId) ?? null;

    const forSale = passes.filter(
      (p): p is { id: number; name: string; price: number } =>
        typeof p.price === "number" && p.price > 0,
    );
    const prices = forSale.map((p) => p.price);
    const style: MonetizationStyle =
      forSale.length === 0
        ? "none"
        : forSale.length >= HEAVY_THRESHOLD
          ? "gamepass-heavy"
          : "gamepass-light";

    const ladder = forSale
      .slice()
      .sort((a, b) => b.price - a.price)
      .slice(0, LADDER_SIZE)
      .map((p) => ({ id: p.id, name: p.name, price: p.price }));

    return {
      ok: true,
      universeId: t.universeId,
      name: t.name,
      thumbnailUrl,
      passCount: passes.length,
      forSaleCount: forSale.length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      priceMedian: median(prices),
      style,
      passes: ladder,
      note:
        forSale.length === 0
          ? "No gamepasses for sale — this game likely monetizes through in-game developer products (not publicly listable) or isn't heavily monetized."
          : "Gamepasses only — developer products aren't publicly listable, so the full picture may be larger.",
    };
  },
);
