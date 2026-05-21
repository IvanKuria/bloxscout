# Architecture

Bloxscout uses a core-library-plus-transport-wrappers shape borrowed from MCP
servers like PostHog's, Linear's, and Stripe's: one transport-agnostic core,
two thin transports (MCP stdio and CLI). This lets the same code path serve an
agent over MCP and a developer over a shell, and lets contributors add a new
transport (HTTP, gRPC) without rewriting Roblox logic.

## System diagram

```
                  +-------------------------------+
                  |   Roblox public endpoints     |
                  |   (games / users / groups /   |
                  |    thumbnails / omni-search)  |
                  +---------------+---------------+
                                  |
                                  v
                  +-------------------------------+
                  |   RobloxClient (src/core)     |
                  |   - undici fetch              |
                  |   - retry + jitter on 5xx/429 |
                  |   - LRU cache w/ TTL buckets  |
                  |   - in-flight de-dup          |
                  +---------------+---------------+
                                  |
                +-----------------+------------------+
                |                                    |
                v                                    v
   +--------------------------+        +---------------------------+
   |  MCP server (src/mcp)    |        |  CLI (src/cli)            |
   |  - 18 tools, Zod->JSON   |        |  - Commander, 15 commands |
   |  - stdio transport       |        |  - --json / table output  |
   |  - exposed as            |        |  - exposed as             |
   |    bloxscout-mcp bin     |        |    bloxscout bin          |
   +-----------+--------------+        +-------------+-------------+
               |                                      |
               v                                      v
        Claude / Cursor /                       Shell scripts,
        Windsurf / Zed agents                   cron, humans
```

## Repository layout

```
src/
  core/        RobloxClient, cache, snapshot store, calculators
  shared/      Zod schemas, error types, shared TS types
  mcp/         MCP server, tool registrations (in development for v0.1)
  cli/         Commander commands and renderers (in development for v0.1)
  mcp.ts       bloxscout-mcp entrypoint
  cli.ts       bloxscout entrypoint
```

Only Phase 1 (`src/core/roblox-client.ts`, `src/core/cache.ts`,
`src/shared/schemas.ts`) ships in `main` today. The MCP and CLI layers are
being built in parallel against the same schemas.

## Why core + transport wrappers

Three reasons:

1. **Symmetric surface.** Every MCP tool maps 1:1 to a CLI subcommand, so
   agents and humans get the same capabilities. Reference implementations:
   [PostHog MCP](https://github.com/PostHog/posthog-mcp),
   [Linear MCP](https://github.com/jerhadf/linear-mcp-server),
   [Stripe MCP](https://github.com/stripe/agent-toolkit).
2. **Testability.** The core has no transport dependencies. Unit tests use
   `undici`'s `MockAgent`; the MCP and CLI layers only need to verify they
   wire arguments correctly.
3. **Reuse.** Future transports (HTTP server, library import) can call the
   core directly without ever instantiating an MCP server.

## Caching strategy

`BloxscoutCache` wraps [`lru-cache`](https://www.npmjs.com/package/lru-cache)
with a `get(key, loader, ttlSeconds)` interface that does fetch-if-missing,
stores with a per-entry TTL, and de-duplicates concurrent loads for the same
key (no thundering herd to Roblox when N MCP tools all ask for the same
universe ID at once).

Three TTL buckets from `src/core/cache.ts`:

| Bucket | Seconds | Used for |
| --- | --- | --- |
| `LIVE` | 60 | CCU / presence projection. |
| `DEFAULT` | 300 | Search results. |
| `SLOW` | 600 | Game metadata, group info, user profiles, thumbnails. |

Default cache size is 1,000 entries (LRU). Persistent on-disk caching is
intentionally out of scope for v0.1 — the snapshot store handles long-lived
data.

## Retry strategy

In `RobloxClient.fetchJsonUncached`:

- Network errors and HTTP 5xx → retry up to `maxRetries` (default 3) with
  exponential backoff and full jitter: `floor(random() * min(5000, 200 *
  2^attempt))` ms.
- HTTP 429 → same retry budget, but if Roblox sends `Retry-After`, we honor
  that exact delay (in seconds or HTTP-date).
- HTTP 404 → `RobloxNotFoundError`, no retry.
- HTTP 400 and other 4xx → fail fast as `RobloxApiError` /
  `ROBLOX_BAD_REQUEST`.

Outbound requests always carry a stable, identifying User-Agent:
`bloxscout/0.0.1 (+https://github.com/IvanKuria/bloxscout)`. Operators can
override it via the `userAgent` constructor option or
`BLOXSCOUT_USER_AGENT`.

## Snapshot store (planned v0.2)

`~/.bloxscout/data.db` is a SQLite file (via
[`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3)) that
records point-in-time game state on demand or on a schedule. This is what
makes `get_trending_games`, `get_game_history`, and `get_up_and_coming`
possible — Roblox does not expose historical CCU or visits. See
[Snapshots and History](./Snapshots-and-History.md) for the schema and
operational notes.

## Extension points

### Adding a new tool

1. Define `<Tool>InputSchema` and `<Tool>OutputSchema` in
   `src/shared/schemas.ts` (Zod, with TypeScript types re-exported).
2. Implement the core logic in `src/core/` — pure functions over
   `RobloxClient`, no MCP or Commander imports.
3. Register the MCP tool in `src/mcp/tools/` so `tools/list` advertises it
   and `tools/call` dispatches correctly.
4. Add a Commander subcommand in `src/cli/commands/` if it makes sense as a
   one-shot.
5. Add unit tests (mocked transport) and an integration test gated on
   `INTEGRATION=1`.
6. Update [Tools Reference](./Tools-Reference.md) and
   [CLI Reference](./CLI-Reference.md), and add a `CHANGELOG.md` entry.

### Adding a new Roblox endpoint

Add the base URL to the `ROBLOX_ENDPOINTS` object in
`src/core/roblox-client.ts`, then expose a typed method that calls
`this.fetchJson` with an appropriate `cacheKey` and `ttlSeconds`. Pick the
TTL bucket that matches the freshness expectation (`LIVE` / `DEFAULT` /
`SLOW`).

### Swapping the cache backend

`BloxscoutCache` is constructor-injected into `RobloxClient`. To swap the
backend (e.g. Redis for a multi-process deployment), implement the same
`get(key, loader, ttlSeconds): Promise<T>` interface and pass it as
`new RobloxClient({ cache: myCache })`. The in-flight de-dup map should be
kept process-local even when the value store is shared.

## See also

- [Roblox Data Sources](./Roblox-Data-Sources.md) — every endpoint, our cache
  TTL, what we do not scrape.
- [Snapshots and History](./Snapshots-and-History.md) — the SQLite store that
  unlocks historical analytics.
