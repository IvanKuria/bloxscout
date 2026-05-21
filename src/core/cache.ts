import { LRUCache } from "lru-cache";

/**
 * TTL bucket presets (in seconds) for the kinds of data Bloxscout fetches.
 * Pass one of these (or any raw number) to `BloxscoutCache.get` so call
 * sites stay declarative about freshness expectations.
 */
export const CACHE_TTL = {
  /** Live signals: CCU, presence — refresh aggressively. */
  LIVE: 60,
  /** Default fallback for unspecified call sites. */
  DEFAULT: 300,
  /** Slow-changing metadata: game details, group info, user profiles. */
  SLOW: 600,
} as const;

export type CacheTtlSeconds = number;

export interface BloxscoutCacheOptions {
  /** Max entries before LRU eviction. Defaults to 1,000. */
  max?: number;
}

interface CachedEntry<T> {
  value: T;
}

/**
 * Thin wrapper around `lru-cache` that exposes a single `get(key, fn, ttl)`
 * method: fetch-if-missing, store with a per-entry TTL, and de-duplicate
 * concurrent loads for the same key so a thundering-herd of MCP calls
 * doesn't fan out to Roblox.
 */
export class BloxscoutCache {
  private readonly store: LRUCache<string, CachedEntry<unknown>>;
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(options: BloxscoutCacheOptions = {}) {
    this.store = new LRUCache<string, CachedEntry<unknown>>({
      max: options.max ?? 1_000,
      // Per-entry TTL is supplied to `set` via the `ttl` option below; we
      // enable `allowStale: false` so expired entries are evicted on read.
      ttlAutopurge: false,
      allowStale: false,
    });
  }

  /**
   * Return the cached value for `key`, or fetch it via `loader`, cache it
   * for `ttlSeconds`, and return the fresh value. Concurrent calls with
   * the same key share a single in-flight loader promise.
   */
  async get<T>(key: string, loader: () => Promise<T>, ttlSeconds: CacheTtlSeconds): Promise<T> {
    const cached = this.store.get(key) as CachedEntry<T> | undefined;
    if (cached !== undefined) {
      return cached.value;
    }
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing !== undefined) {
      return existing;
    }
    const promise = (async () => {
      try {
        const value = await loader();
        this.store.set(key, { value } as CachedEntry<unknown>, {
          ttl: ttlSeconds * 1000,
        });
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, promise as Promise<unknown>);
    return promise;
  }

  /** Force-evict a single entry; primarily useful for tests. */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Drop everything. */
  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  /** Returns true iff `key` has a non-expired entry. */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Current number of live entries. */
  get size(): number {
    return this.store.size;
  }
}
