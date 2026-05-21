/**
 * Genre alias and normalization table for the discovery tools
 * (`get_top_by_genre`, `get_trending_games`, `analyze_game_vs_genre`).
 *
 * History: prior to v0.1.0 this module exported a hand-curated map of
 * universe ids per genre. Those ids drifted (many resolved to abandoned
 * Studio template games with 0 CCU) and produced useless rankings. The
 * tools now derive their candidate set live from
 * `RobloxClient.searchGames(<query>)` (the omni-search endpoint),
 * which surfaces the actual top games for that keyword in real time
 * and is self-correcting as popularity shifts.
 *
 * This module's only remaining job is:
 *
 *   1. Canonicalize whatever genre slug the user / agent passes in
 *      (lowercase, hyphenated, trim whitespace).
 *   2. Map well-known aliases (`rpg` -> `role-playing`, `fps` -> `shooter`)
 *      to the canonical slug.
 *   3. Provide the keyword we send to omni-search for each canonical slug.
 *
 * Adding a new supported genre: append an entry below. Pick a `searchQuery`
 * that returns sensible results — try it against
 * `apis.roblox.com/search-api/omni-search?searchQuery=<q>&pageType=all`
 * before committing.
 */
export interface GenreSeedEntry {
  /** Display label (Roblox's `genre_l1` capitalization, used in report titles). */
  label: string;
  /** Aliases users / agents are likely to pass in (lowercase, no punctuation). */
  aliases: string[];
  /**
   * Keyword sent to `RobloxClient.searchGames` to enumerate live top games
   * for this genre. Usually the canonical slug itself; can override when a
   * more search-friendly term ("simulator", not "sim") yields better hits.
   */
  searchQuery: string;
}

/**
 * Frozen map keyed by normalized genre slug. Use `lookupGenre` instead of
 * indexing directly so aliasing (e.g. "rpg" -> "role-playing") is consistent.
 */
export const GENRE_SEEDS: Readonly<Record<string, GenreSeedEntry>> = Object.freeze({
  "role-playing": {
    label: "RPG",
    aliases: ["rpg", "roleplay", "role-play", "role play", "roleplaying", "role-playing"],
    searchQuery: "rpg",
  },
  adventure: {
    label: "Adventure",
    aliases: ["adventure", "exploration"],
    searchQuery: "adventure",
  },
  fighting: {
    label: "Fighting",
    aliases: ["fighting", "combat", "fighter"],
    searchQuery: "fighting",
  },
  obby: {
    label: "Obby",
    aliases: ["obby", "obstacle", "platformer"],
    searchQuery: "obby",
  },
  simulator: {
    label: "Simulator",
    aliases: ["simulator", "sim", "tycoon"],
    searchQuery: "simulator",
  },
  social: {
    label: "Social",
    aliases: ["social", "town", "hangout", "roleplay-social"],
    searchQuery: "roleplay",
  },
  horror: {
    label: "Horror",
    aliases: ["horror", "scary", "survival-horror"],
    searchQuery: "horror",
  },
  shooter: {
    label: "Shooter",
    aliases: ["shooter", "fps", "shooting"],
    searchQuery: "shooter",
  },
});

/**
 * Normalize a user-provided genre string (case + whitespace insensitive) and
 * resolve it through the alias table.
 */
export function lookupGenre(genre: string): GenreSeedEntry | undefined {
  const norm = genre.trim().toLowerCase().replace(/\s+/g, "-");
  if (norm in GENRE_SEEDS) return GENRE_SEEDS[norm];
  for (const entry of Object.values(GENRE_SEEDS)) {
    if (entry.aliases.includes(norm)) return entry;
    if (entry.label.toLowerCase() === norm) return entry;
  }
  return undefined;
}

/**
 * Resolve any user-provided genre keyword into a search query suitable for
 * `RobloxClient.searchGames`. Known aliases (e.g. `rpg` -> `role-playing`)
 * are normalized to their canonical entry's `searchQuery`; unknown keywords
 * pass through verbatim (normalized for case/whitespace) so omni-search can
 * resolve them directly.
 *
 * v0.1.2: replaces the previous allowlist gate (#40). Real Roblox has a
 * long tail of popular genres (tower-defense, anime, racing, tycoon,
 * battlegrounds, ...) that omni-search handles natively but the curated
 * `GENRE_SEEDS` table does not — rejecting them at the tool boundary was an
 * adoption blocker.
 */
export function resolveGenreSearchQuery(genre: string): string {
  const entry = lookupGenre(genre);
  if (entry !== undefined) return entry.searchQuery;
  return genre.trim().toLowerCase().replace(/\s+/g, "-");
}

/** List of supported genre slugs, for diagnostics / error messages. */
export const SUPPORTED_GENRES: readonly string[] = Object.freeze(Object.keys(GENRE_SEEDS));

/**
 * Search queries for all supported genres, used by `get_trending_games`
 * when no genre is provided (cross-genre "what's hot right now" sweep).
 */
export const ALL_GENRE_SEARCH_QUERIES: readonly string[] = Object.freeze(
  Object.values(GENRE_SEEDS).map((e) => e.searchQuery),
);
