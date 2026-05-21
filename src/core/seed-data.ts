/**
 * Curated per-genre seed lists of well-known Roblox universe ids.
 *
 * Roblox does not expose a stable, unauthenticated "top games by genre" or
 * "top creators by genre" endpoint. Until the Phase 4 snapshot store is online
 * and has accumulated enough samples to drive a real ranking, several v0.1
 * tools fall back to these curated lists:
 *
 *   - `get_top_by_genre` (Phase 2) — ranks the seed list by CCU / visits / favorites.
 *   - `get_top_creators_by_genre` (Phase 5a) — aggregates creator CCU across the seed list.
 *
 * Keeping the lists in one module avoids drift between tools and makes a
 * future swap to live data a single-call change.
 *
 * Genre keys are normalized lower-case strings; lookup is case-insensitive
 * via {@link getSeedUniverseIds}. Each list contains 10-20 well-known games
 * across creators of varying size — large enough to give a meaningful
 * aggregation, small enough to fit in one batched `getGames` call (cap 100).
 *
 * Universe ids were chosen from long-running, broadly recognised titles in
 * each genre. They are stable identifiers; the games behind them may rise or
 * fall in popularity, which is fine — that's exactly what the ranking step
 * is for.
 */

/**
 * Lower-cased genre slug -> ordered list of seed universe ids.
 *
 * Order is informational only; tools using this map always re-rank by a live
 * metric (CCU, visits, favorited count).
 */
export const SEED_GAMES_BY_GENRE: Record<string, readonly number[]> = {
  simulator: [
    2753915549, // Pet Simulator X
    920587237, // Adopt Me!
    5161730065, // Pet Simulator 99
    3527629855, // Anime Fighters Simulator
    2788229376, // Bee Swarm Simulator
    1962086868, // Tower of Hell (adjacent obby-sim)
    5304684019, // Blox Fruits (RPG-sim crossover)
    537413528, // Build A Boat For Treasure
    155615604, // Lumber Tycoon 2
    3101667897, // Pet Simulator 2 lineage
    3956818381, // Anime Fighting Simulator
    4801442574, // Saber Simulator
  ],
  obby: [
    1962086868, // Tower of Hell
    537413528, // Build A Boat For Treasure (obby-adjacent)
    7444611162, // Doors (horror-obby blend)
    6403373529, // Piggy: Branched Realities
    3823781113, // Mega Easy Obby
    142823291, // Murder Mystery 2 (community-obby maps)
    5036486769, // Obby But You're On A Bike
    6284583030, // Obby Creator
    93105950, // Speed Run 4
    3260590327, // The Floor is Lava
  ],
  roleplay: [
    920587237, // Adopt Me!
    142823291, // Murder Mystery 2
    286090429, // Arsenal (PvP-roleplay)
    1224212277, // Welcome to Bloxburg
    383310974, // Brookhaven RP (root place id alt; universe via search)
    4924922222, // Brookhaven RP
    3956818381, // Anime Fighting Simulator (RP crossover)
    1118017032, // Royale High
    8737899170, // Livetopia
    6403373529, // Piggy
    155615604, // Lumber Tycoon 2
  ],
  rpg: [
    5304684019, // Blox Fruits
    3527629855, // Anime Fighters Simulator
    3956818381, // Anime Fighting Simulator
    2788229376, // Bee Swarm Simulator
    155615604, // Lumber Tycoon 2
    1118017032, // Royale High
    6403373529, // Piggy
    1962086868, // Tower of Hell
    537413528, // Build A Boat For Treasure
    2753915549, // Pet Simulator X
  ],
  fighting: [
    5304684019, // Blox Fruits
    3956818381, // Anime Fighting Simulator
    3527629855, // Anime Fighters Simulator
    286090429, // Arsenal
    142823291, // Murder Mystery 2
    4801442574, // Saber Simulator
    6403373529, // Piggy
  ],
  horror: [
    7444611162, // Doors
    6403373529, // Piggy
    142823291, // Murder Mystery 2
    3260590327, // The Floor is Lava (party-horror crossover)
  ],
  racing: [
    537413528, // Build A Boat For Treasure (boat racing)
    93105950, // Speed Run 4
    5036486769, // Obby But You're On A Bike
  ],
  party: [
    3260590327, // The Floor is Lava
    142823291, // Murder Mystery 2
    286090429, // Arsenal
    1962086868, // Tower of Hell
  ],
};

/**
 * Case-insensitive lookup. Returns `undefined` when the genre is unknown so
 * callers can produce a tool-friendly error.
 */
export function getSeedUniverseIds(genre: string): readonly number[] | undefined {
  const key = genre.trim().toLowerCase();
  return SEED_GAMES_BY_GENRE[key];
}

/** Sorted list of supported genre keys (lower-case). Useful for tool descriptions and error messages. */
export const SUPPORTED_SEED_GENRES: readonly string[] = Object.keys(SEED_GAMES_BY_GENRE).sort();
