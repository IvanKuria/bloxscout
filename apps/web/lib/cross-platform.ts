/**
 * Pure helpers for the cross-platform "replicate-this" radar: a deterministic
 * Steam-tag/genre → candidate-Roblox-niche heuristic, and a resolver that finds
 * one external game in a list by name or appId.
 *
 * The niche mapping is an explicitly-labeled HINT — the agent must verify it,
 * never assert it as fact (mirrors the system prompt's "never assert what the
 * data doesn't show"). No IO; safe to import anywhere and unit-test.
 */

export interface NicheHint {
  /** Human-readable candidate Roblox niche, e.g. "tower defense". */
  niche: string;
  /** A `/genre/[slug]` slug when the niche maps to a known Roblox genre, else null. */
  slug: string | null;
}

/**
 * Ordered rules: the first whose keyword appears in the game's tags/genres wins.
 * `slug` links to an existing `/genre/[slug]` page when one fits; otherwise the
 * consuming page should link to `/rising-roblox-niches` instead.
 */
const TAG_NICHE_RULES: ReadonlyArray<{ match: string[]; niche: string; slug: string | null }> = [
  { match: ["hide and seek", "social deduction", "party game"], niche: "hide-and-seek / social", slug: null },
  { match: ["tower defense"], niche: "tower defense", slug: "tower-defense" },
  { match: ["roguelike", "roguelite", "deckbuilder", "deck building"], niche: "roguelike", slug: null },
  { match: ["tycoon", "management", "idle", "incremental", "clicker"], niche: "tycoon / idle", slug: null },
  { match: ["horror", "survival horror"], niche: "horror", slug: "horror" },
  { match: ["parkour", "platformer"], niche: "obby / platformer", slug: null },
  { match: ["simulator", "simulation"], niche: "simulator", slug: null },
  { match: ["fps", "shooter"], niche: "shooter", slug: "shooter" },
  { match: ["fighting", "brawler"], niche: "fighting", slug: null },
  { match: ["racing", "driving"], niche: "racing", slug: null },
  { match: ["sandbox", "building", "base building"], niche: "sandbox / building", slug: null },
  { match: ["rpg", "role-playing", "role playing"], niche: "RPG", slug: "rpg" },
  { match: ["puzzle"], niche: "puzzle", slug: null },
  { match: ["co-op", "cooperative"], niche: "co-op multiplayer", slug: null },
];

/**
 * Best-guess Roblox niche for an external game from its Steam tags + genres.
 * Returns null when nothing matches (the agent then reasons unaided).
 */
export function candidateRobloxNiche(
  tags: ReadonlyArray<string>,
  genres: ReadonlyArray<string>,
): NicheHint | null {
  const hay = [...tags, ...genres].map((s) => s.toLowerCase());
  for (const rule of TAG_NICHE_RULES) {
    if (rule.match.some((m) => hay.some((h) => h.includes(m)))) {
      return { niche: rule.niche, slug: rule.slug };
    }
  }
  return null;
}

/** Find one external game by appId (preferred) or name (exact, then substring). */
export function matchExternalGame<T extends { appId: number; name: string }>(
  query: { gameName?: string; appId?: number },
  entries: ReadonlyArray<T>,
): T | null {
  if (typeof query.appId === "number") {
    const byId = entries.find((e) => e.appId === query.appId);
    if (byId) return byId;
  }
  const q = query.gameName?.trim().toLowerCase();
  if (!q) return null;
  return (
    entries.find((e) => e.name.toLowerCase() === q) ??
    entries.find((e) => e.name.toLowerCase().includes(q)) ??
    null
  );
}
