import type { Game } from "./types.js";

export interface RobloxClientOptions {
  /** Optional cache (LRU or similar) for hot endpoint responses. */
  cache?: unknown;
  /** Custom User-Agent string sent with every outbound request. */
  userAgent?: string;
}

/**
 * Transport-agnostic Roblox data client.
 *
 * Phase 1 will implement public endpoint calls (search, game details, votes,
 * favorites, server lists, etc.) on top of `undici` with the cache and
 * user-agent supplied at construction time.
 */
export class RobloxClient {
  private readonly cache: unknown;
  private readonly userAgent: string;

  constructor(options: RobloxClientOptions = {}) {
    this.cache = options.cache;
    this.userAgent =
      options.userAgent ?? "bloxscout/0.0.1 (+https://github.com/IvanKuria/bloxscout)";
  }

  // TODO(Phase 1): implement public endpoint calls
  async searchGames(_keyword: string): Promise<Game[]> {
    throw new Error("not implemented — Phase 1");
  }
}
