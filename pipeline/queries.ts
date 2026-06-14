/**
 * Omni-search keyword sweep for discovery. The genre seed queries (shared
 * with the MCP tools) anchor the list; the extra terms widen the net to
 * popular formats, mechanics, and perennial themes that the home-page
 * explore sorts under-represent.
 */

import { ALL_GENRE_SEARCH_QUERIES } from "@bloxscout/core/genre-seeds";

const EXTRA_DISCOVERY_QUERIES: readonly string[] = [
  // Formats / mechanics
  "tycoon",
  "tower defense",
  "clicker",
  "idle",
  "incremental",
  "battlegrounds",
  "pvp arena",
  "battle royale",
  "racing",
  "parkour",
  "difficulty chart obby",
  "escape",
  "hide and seek",
  "murder mystery",
  "piggy",
  "survival",
  "zombie survival",
  "open world",
  "sandbox",
  "building game",
  "trading game",
  "merge game",
  // Themes
  "anime",
  "anime fighting",
  "pet simulator",
  "pet collecting",
  "fishing",
  "mining",
  "farming",
  "restaurant",
  "cafe",
  "school",
  "hospital",
  "prison",
  "military",
  "naval warfare",
  "space",
  "dragon",
  "wolf",
  "dinosaur",
  "car driving",
  "car dealership",
  "football",
  "soccer",
  "basketball",
  "dress up",
  "makeover",
  "roleplay town",
  "brookhaven style",
  "story game",
  "scary story",
  "backrooms",
];

export const DISCOVERY_QUERIES: readonly string[] = Object.freeze([
  ...new Set([...ALL_GENRE_SEARCH_QUERIES, ...EXTRA_DISCOVERY_QUERIES]),
]);
