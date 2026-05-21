import { analyzeGameVsGenre } from "./analyze-game-vs-genre.js";
import { calculateDevexInfo } from "./calculate_devex.js";
import { compareGames } from "./compare-games.js";
import { estimateGameRevenueInfo } from "./estimate_game_revenue.js";
import { getCreator } from "./get-creator.js";
import { getGameIcons } from "./get-game-icons.js";
import { getGamePlayerCount } from "./get-game-player-count.js";
import { getGame } from "./get-game.js";
import { getGroup } from "./get-group.js";
import { getTopByGenre } from "./get-top-by-genre.js";
import { getTrendingGames } from "./get-trending-games.js";
import { getGameHistory } from "./get_game_history.js";
import { getTopCreatorsByGenreInfo } from "./get_top_creators_by_genre.js";
import { getUpAndComing } from "./get_up_and_coming.js";
import { searchGames } from "./search-games.js";
import { snapshotGame } from "./snapshot_game.js";
import type { ToolDefinition } from "./types.js";

/**
 * The full set of tools shipped in Phase 2. Order matches the README's tool
 * table grouping (discovery, game intelligence, creator/community).
 *
 * Adding a new tool: implement it in a sibling file, then append it to this
 * array. `createMcpServer` iterates this list to register handlers — no other
 * wiring is required.
 */
// biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool definitions, type-erased at the registry boundary
export const allTools: ReadonlyArray<ToolDefinition<any, any>> = Object.freeze([
  // Discovery
  searchGames,
  getTrendingGames,
  getTopByGenre,
  // Game intelligence
  getGame,
  getGamePlayerCount,
  compareGames,
  analyzeGameVsGenre,
  // Creator and community
  getCreator,
  getGroup,
  getGameIcons,
  getTopCreatorsByGenreInfo,
  // Calculators
  calculateDevexInfo,
  estimateGameRevenueInfo,
  // Operational / snapshots
  snapshotGame,
  getGameHistory,
  getUpAndComing,
]);

export {
  analyzeGameVsGenre,
  calculateDevexInfo,
  compareGames,
  estimateGameRevenueInfo,
  getCreator,
  getGame,
  getGameHistory,
  getGameIcons,
  getGamePlayerCount,
  getGroup,
  getTopByGenre,
  getTopCreatorsByGenreInfo,
  getTrendingGames,
  getUpAndComing,
  searchGames,
  snapshotGame,
};
