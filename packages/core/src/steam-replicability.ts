/**
 * Replicability filter for the cross-platform "replicate-this" radar.
 *
 * The radar is for solo / small Roblox devs who want to ship a clone in DAYS, so
 * it must surface CHEAP, mechanically-SIMPLE indie games ("friend slop" — co-op,
 * party, social, physics-comedy games that go viral via streamers) and must NOT
 * recommend AAA titles or deep, hard-to-clone games no one can rebuild solo.
 *
 * This pure module (mirrors `steam-virality.ts` — no IO, no state) turns a game's
 * storefront signals into:
 *   - a HARD exclude decision (`replicable` / `excludeReason`) for clear AAA, and
 *   - a SOFT `replicabilityScore` in [0,1] that re-ranks the rest so the simplest,
 *     most clone-able concepts float to the top.
 *
 * Ranking folds virality × replicability in `pipeline/steam-breakouts.ts`.
 */

export interface ReplicabilitySignals {
  /** USD price (0 = free, null = unknown). AAA is premium-priced. */
  priceUsd: number | null;
  developers: string[];
  publishers: string[];
  genres: string[];
  tags: string[];
}

export interface ReplicabilityFactors {
  /** Cheap/free → high. AAA pricing → low. */
  affordability: number;
  /** Few mechanically-complex genres → high. */
  simplicity: number;
  /** Co-op / party / social / funny / physics traits → high. */
  friendSlop: number;
}

export interface ReplicabilityResult {
  /** False → drop from the radar entirely (clear AAA — wrong audience). */
  replicable: boolean;
  /** Human-readable reason when excluded; null when kept. */
  excludeReason: string | null;
  /** [0,1] — how clone-able / "friend slop" the concept looks (re-ranks kept games). */
  replicabilityScore: number;
  factors: ReplicabilityFactors;
}

// --- tunables (documented so the thresholds are reviewable) ---

/** Price at/above which we treat a title as premium/AAA and exclude it outright. */
const AAA_PRICE_FLOOR_USD = 35;
/** Price (USD) at which affordability hits 0 — also the AAA floor. Free → 1. */
const AFFORDABILITY_CEILING_USD = 35;
/** Affordability when price is unknown (neutral-ish). */
const AFFORDABILITY_UNKNOWN = 0.6;
/** Each mechanically-complex genre/tag cuts this much off the simplicity sub-score. */
const COMPLEXITY_PENALTY_PER_HIT = 0.3;
/** Friend-slop trait count that maxes out the sub-score. */
const FRIEND_SLOP_TARGET_HITS = 4;

const WEIGHTS = {
  friendSlop: 0.4,
  simplicity: 0.3,
  affordability: 0.2,
  indie: 0.1,
} as const;

/**
 * Megapublishers/developers whose games are out of scope for a "clone it in days"
 * radar. Matched case-insensitively as substrings of dev/publisher names. Kept to
 * unambiguous AAA names — mid-tier indie publishers are intentionally absent so we
 * don't drop genuinely clone-able games. Discounted AAA (below the price floor) is
 * caught here.
 */
const AAA_COMPANIES = [
  "electronic arts",
  "ubisoft",
  "activision",
  "blizzard",
  "rockstar",
  "take-two",
  "take two",
  "2k games",
  "bethesda",
  "zenimax",
  "square enix",
  "capcom",
  "bandai namco",
  "sega",
  "sony interactive",
  "playstation studios",
  "xbox game studios",
  "microsoft",
  "nintendo",
  "tencent",
  "netease",
  "cd projekt",
  "warner bros",
  "wb games",
  "riot games",
  "krafton",
  "hoyoverse",
  "mihoyo",
  "konami",
];

/** Genres/tags that signal a mechanically deep game (hard to clone solo, not friend slop). */
const COMPLEX_TERMS = [
  "open world",
  "rpg",
  "jrpg",
  "story rich",
  "simulation",
  "grand strategy",
  "4x",
  "city builder",
  "souls",
  "metroidvania",
  "survival",
  "base building",
  "mmo",
  "massively multiplayer",
  "immersive sim",
  "management",
  "real-time strategy",
  "rts",
  "turn-based strategy",
];

/** Genres/tags that signal cheap, chaotic, easy-to-grok multiplayer "friend slop". */
const FRIEND_SLOP_TERMS = [
  "co-op",
  "co op",
  "online co-op",
  "local co-op",
  "multiplayer",
  "local multiplayer",
  "party",
  "social deduction",
  "casual",
  "funny",
  "meme",
  "physics",
  "cute",
  "colorful",
  "family friendly",
  "comedy",
  "parody",
  "minigames",
  "silly",
];

function normalize(values: string[]): string[] {
  return values.map((v) => v.toLowerCase());
}

function anyMatches(haystack: string[], needles: string[]): boolean {
  return haystack.some((h) => needles.some((n) => h.includes(n)));
}

function countMatches(haystack: string[], needles: string[]): number {
  return needles.reduce((acc, n) => acc + (haystack.some((h) => h.includes(n)) ? 1 : 0), 0);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Affordability sub-score: free → 1, scales linearly to 0 at the AAA floor. */
export function affordabilitySubscore(priceUsd: number | null): number {
  if (priceUsd === null) return AFFORDABILITY_UNKNOWN;
  return clamp01(1 - priceUsd / AFFORDABILITY_CEILING_USD);
}

/** Assess whether a game is worth recommending as a clone target, and how clone-able it is. */
export function assessReplicability(signals: ReplicabilitySignals): ReplicabilityResult {
  const genresLc = normalize(signals.genres);
  const tagsLc = normalize(signals.tags);
  const taxonomy = [...genresLc, ...tagsLc];
  const companies = normalize([...signals.developers, ...signals.publishers]);

  const affordability = affordabilitySubscore(signals.priceUsd);
  const complexHits = countMatches(taxonomy, COMPLEX_TERMS);
  const simplicity = clamp01(1 - COMPLEXITY_PENALTY_PER_HIT * complexHits);
  const friendHits = countMatches(taxonomy, FRIEND_SLOP_TERMS);
  const friendSlop = clamp01(friendHits / FRIEND_SLOP_TARGET_HITS);
  const isIndie = taxonomy.some((t) => t.includes("indie"));

  const replicabilityScore = clamp01(
    WEIGHTS.friendSlop * friendSlop +
      WEIGHTS.simplicity * simplicity +
      WEIGHTS.affordability * affordability +
      WEIGHTS.indie * (isIndie ? 1 : 0),
  );

  const factors: ReplicabilityFactors = { affordability, simplicity, friendSlop };

  // --- hard excludes (clear AAA — wrong audience for a clone-it-in-days radar) ---
  if (signals.priceUsd !== null && signals.priceUsd >= AAA_PRICE_FLOOR_USD) {
    return {
      replicable: false,
      excludeReason: `AAA pricing ($${signals.priceUsd.toFixed(2)})`,
      replicabilityScore,
      factors,
    };
  }
  const aaaHit = AAA_COMPANIES.find((c) => companies.some((name) => name.includes(c)));
  if (aaaHit) {
    return {
      replicable: false,
      excludeReason: `AAA publisher/developer (${aaaHit})`,
      replicabilityScore,
      factors,
    };
  }

  return { replicable: true, excludeReason: null, replicabilityScore, factors };
}
