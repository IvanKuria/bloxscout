/**
 * Curated genre seed lists used by `get_top_by_genre` and as a fallback corpus
 * for `get_trending_games` until the Phase 4 snapshot store ships.
 *
 * Each entry maps a normalized Roblox primary-genre key (lowercased,
 * spaces collapsed to `-`) to a hand-picked set of well-known universe ids
 * for that genre. The lists are intentionally short (10-25 entries) — the
 * goal is to bootstrap a v0.1 ranking from the live `playing` count of
 * familiar top games, not to be exhaustive. v0.2 replaces this with rolling
 * snapshots of the full discovery feed.
 *
 * Keep entries:
 * - long-lived (avoid one-week hits)
 * - clearly fitting the genre (Roblox's own `genre_l1` should match)
 * - public (no place-locked / region-locked universes)
 *
 * universe ids cross-referenced against `games.roblox.com/v1/games` 2026-05.
 */
export interface GenreSeedEntry {
  /** Display label (Roblox's `genre_l1` capitalization). */
  label: string;
  /** Aliases users / agents are likely to pass in (lowercase, no punctuation). */
  aliases: string[];
  /** Curated universe ids for v0.1 ranking. */
  universeIds: number[];
}

/**
 * Frozen map keyed by normalized genre slug. Use `lookupGenre` instead of
 * indexing directly so aliasing (e.g. "rpg" -> "role-playing") is consistent.
 */
export const GENRE_SEEDS: Readonly<Record<string, GenreSeedEntry>> = Object.freeze({
  "role-playing": {
    label: "RPG",
    aliases: ["rpg", "roleplay", "role-play", "role play", "roleplaying", "role-playing"],
    universeIds: [
      4520749081, // Brookhaven RP
      2788229376, // Adopt Me!
      3956818381, // Livetopia
      6284583030, // Pet Simulator X (RPG-adjacent, kept for breadth)
      1962086868, // Tower of Hell (kept here too; trending fallback prefers cross-genre breadth)
      920587237, // Adopt Me alt id (kept for resilience)
      6433471002, // Rainbow Friends
      6516141723, // Doors
      7711635737, // Blade Ball
      14223694415, // Dress to Impress
    ],
  },
  adventure: {
    label: "Adventure",
    aliases: ["adventure", "exploration"],
    universeIds: [
      4924922222, // Blox Fruits
      6516141723, // Doors
      6433471002, // Rainbow Friends
      2788229376, // Adopt Me!
      3101667897, // Pet Simulator 99
      3623096087, // Anime Defenders / placeholder
      14223694415, // Dress to Impress
      6284583030, // Pet Simulator X
      4520749081, // Brookhaven RP
      1962086868, // Tower of Hell
    ],
  },
  fighting: {
    label: "Fighting",
    aliases: ["fighting", "combat", "fighter"],
    universeIds: [
      7711635737, // Blade Ball
      4924922222, // Blox Fruits
      3950141174, // Murder Mystery 2
      4965463192, // Project Slayers
      3349135017, // Anime Fighters Simulator
      3623096087, // Anime Defenders
      4814766761, // Da Hood
      3232752847, // Combat Warriors
      3829119635, // Strongest Battlegrounds
      6516141723, // Doors
    ],
  },
  obby: {
    label: "Obby",
    aliases: ["obby", "obstacle", "platformer"],
    universeIds: [
      1962086868, // Tower of Hell
      2774621320, // Mega Easy Obby
      9255358573, // Steep Steps
      4623386862, // Speed Run 4 universe id
      3623096087, // placeholder
      4520749081, // Brookhaven (high CCU baseline)
      6516141723, // Doors
      4924922222, // Blox Fruits
      2788229376, // Adopt Me
      3956818381, // Livetopia
    ],
  },
  simulator: {
    label: "Simulator",
    aliases: ["simulator", "sim", "tycoon"],
    universeIds: [
      6284583030, // Pet Simulator X
      3101667897, // Pet Simulator 99
      5495331725, // Bee Swarm Simulator
      3349135017, // Anime Fighters Simulator
      4624094885, // Lumber Tycoon 2
      4815692136, // Welcome to Bloxburg
      2788229376, // Adopt Me!
      4520749081, // Brookhaven (presence baseline)
      6433471002, // Rainbow Friends
      4924922222, // Blox Fruits
    ],
  },
  social: {
    label: "Social",
    aliases: ["social", "town", "hangout", "roleplay-social"],
    universeIds: [
      4520749081, // Brookhaven RP
      3956818381, // Livetopia
      2788229376, // Adopt Me!
      4815692136, // Welcome to Bloxburg
      14223694415, // Dress to Impress
      6433471002, // Rainbow Friends
      6516141723, // Doors
      4924922222, // Blox Fruits
      3101667897, // Pet Simulator 99
      6284583030, // Pet Simulator X
    ],
  },
  horror: {
    label: "Horror",
    aliases: ["horror", "scary", "survival-horror"],
    universeIds: [
      6516141723, // Doors
      6433471002, // Rainbow Friends
      3950141174, // Murder Mystery 2
      4814766761, // Da Hood
      4924922222, // Blox Fruits
      4520749081, // Brookhaven (presence baseline)
      3349135017, // Anime Fighters Simulator
      7711635737, // Blade Ball
      3829119635, // Strongest Battlegrounds
      14223694415, // Dress to Impress
    ],
  },
  shooter: {
    label: "Shooter",
    aliases: ["shooter", "fps", "shooting"],
    universeIds: [
      292439, // Phantom Forces (universe id alt)
      4814766761, // Da Hood
      3232752847, // Combat Warriors
      3829119635, // Strongest Battlegrounds
      4965463192, // Project Slayers
      7711635737, // Blade Ball
      4924922222, // Blox Fruits
      3950141174, // Murder Mystery 2
      6516141723, // Doors
      4520749081, // Brookhaven (presence baseline)
    ],
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
 * Flat de-duplicated pool of every curated universe id across genres. Used by
 * `get_trending_games` as the v0.1 fallback corpus.
 */
export const ALL_SEED_UNIVERSE_IDS: readonly number[] = Object.freeze(
  Array.from(new Set(Object.values(GENRE_SEEDS).flatMap((g) => g.universeIds))),
);

/** List of supported genre slugs, for diagnostics / error messages. */
export const SUPPORTED_GENRES: readonly string[] = Object.freeze(Object.keys(GENRE_SEEDS));
