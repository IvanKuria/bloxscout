# Tools Reference

Bloxscout's MCP server exposes 18 tools, grouped into six categories. Every
tool's input is validated against a Zod schema from
[`src/shared/schemas.ts`](https://github.com/IvanKuria/bloxscout/blob/main/src/shared/schemas.ts);
agents see those schemas as JSON Schema via `tools/list`. Output shapes are
stable across patch releases.

This page is the source of truth your agent should consult when picking a
tool. Section examples use illustrative payloads.

## How caching works

Every tool inherits the shared `RobloxClient` cache (LRU, in-memory, 1000
entries) with three TTL buckets:

- `LIVE` — 60 seconds. Used for player-count projections.
- `DEFAULT` — 300 seconds. Used for search results.
- `SLOW` — 600 seconds. Used for game metadata, creator profiles, groups, icons.

See [Architecture](./Architecture.md#caching-strategy) for the full rationale.

## Error modes

Every tool can surface these error codes (delivered as a structured MCP error):

- `VALIDATION_ERROR` — Input failed Zod validation.
- `ROBLOX_NOT_FOUND` — Roblox returned 404.
- `ROBLOX_RATE_LIMIT` — Roblox returned 429 and we exhausted retries.
- `ROBLOX_BAD_REQUEST` — Roblox returned 400.
- `ROBLOX_API_ERROR` — Generic upstream failure.
- `NOT_IMPLEMENTED` — Tool depends on infrastructure not yet shipped (e.g.
  snapshot store for trending tools, planned v0.2).

---

## Discovery

### `search_games`

Search Roblox's catalog by keyword with optional genre and sort filters.

```ts
// input
{ keyword: string; limit?: number /* 1..100, default 25 */ }
// output
{ results: GameSummary[] }
```

- **Data source:** `apis.roblox.com/search-api/omni-search` (the legacy
  `games.roblox.com/v1/games/list` endpoint now requires auth).
- **Cache:** `DEFAULT` (300s), keyed by lowercased keyword.
- **Example prompt:** *"Search bloxscout for obby games and show me the top 5
  by player count."*

### `get_trending_games`

Return games trending now, optionally filtered by genre. Computed from the
local snapshot store.

```ts
{ genre?: string; limit?: number /* default 20 */ }
// → { games: Game[] }
```

- **Data source:** local SQLite snapshot store (`~/.bloxscout/data.db`).
- **Status:** in development for v0.1 (requires snapshot store, planned v0.2).
- **Example prompt:** *"What are the top 10 trending Simulator games right
  now?"*

### `get_top_by_genre`

List the top games within a specific genre ranked by CCU, visits, or favorites.

```ts
{ genre: string; rankBy?: "playing" | "visits" | "favoritedCount"; limit?: number }
// → { games: Game[] }
```

- **Data source:** `games.roblox.com/v1/games` over a candidate set, with the
  candidate list sourced from `search_games` / snapshot store.
- **Cache:** `SLOW` per game (600s).
- **Example prompt:** *"Top 20 Adventure games ranked by total visits."*

### `get_up_and_coming`

Surface smaller games with unusually strong recent growth (e.g. last 7 days)
that aren't yet on the top charts.

```ts
{ genre?: string; window?: string /* duration */; limit?: number }
// → { games: Game[]; growthMetrics: { ... }[] }
```

- **Data source:** local snapshot store.
- **Status:** in development for v0.1 (requires snapshot store).
- **Example prompt:** *"Find small Tycoon games whose CCU has grown more than
  50% week-over-week."*

### `discover_underserved_genres`

Identify genres with high player demand and low developer supply.

```ts
{ limit?: number }
// → { genres: { name: string; demandIndex: number; supplyIndex: number; ratio: number }[] }
```

- **Data source:** aggregations over Roblox genre rankings + snapshot store.
- **Status:** in development for v0.1.
- **Example prompt:** *"Which genres have the best player demand vs developer
  supply ratio?"*

---

## Game intelligence

### `get_game`

Fetch a single game's full metadata: name, description, creator, stats,
thumbnails.

```ts
{ universeId: number }
// → { game: Game }
```

- **Data source:** `games.roblox.com/v1/games?universeIds=…`.
- **Cache:** `SLOW` (600s).
- **Example prompt:** *"Look up universe 920587237 and summarize its creator
  and current stats."*

### `get_game_player_count`

Return current CCU and total visits for a universe ID. Cheaper than `get_game`
because the projection caches separately with a tighter TTL.

```ts
{ universeId: number }
// → { universeId: number; playing: number; visits: number }
```

- **Data source:** same `games.roblox.com/v1/games` endpoint; only the
  presence projection is returned.
- **Cache:** `LIVE` (60s) on the projection key.
- **Example prompt:** *"How many players are in 920587237 right now?"*

### `get_game_history`

Read locally-stored historical snapshots for a game's CCU, visits, and likes.

```ts
{ universeId: number; window?: string /* e.g. "30d" */; granularity?: "hour" | "day" }
// → { universeId: number; series: { timestamp: string; playing: number; visits: number; likes: number }[] }
```

- **Data source:** local snapshot store.
- **Status:** in development for v0.1 (requires snapshot store).
- **Example prompt:** *"Show me the last 30 days of CCU for universe
  920587237."*

### `compare_games`

Side-by-side comparison of 2–10 games on the same metrics.

```ts
{ universeIds: number[] /* 2..10 */ }
// → { games: Game[] }
```

- **Data source:** `games.roblox.com/v1/games` (batched up to 100 per request
  internally).
- **Cache:** `SLOW` per universe.
- **Example prompt:** *"Compare my game (920587237) head-to-head with Tower of
  Hell (4974551500)."*

### `analyze_game_vs_genre`

Compare one game against the median and percentile of its genre cohort.

```ts
{ universeId: number; cohortSize?: number /* default 50 */ }
// → { game: Game; cohort: GameSummary[]; percentiles: { playing: number; visits: number; favoritedCount: number } }
```

- **Data source:** `get_game` + `get_top_by_genre`.
- **Status:** in development for v0.1.
- **Example prompt:** *"Is universe 920587237's CCU above or below the median
  for its genre?"*

---

## Creator and community

### `get_creator`

Look up a user creator with bio, follower count, and verification status.

```ts
{ userId: number }
// → { user: User }
```

- **Data source:** `users.roblox.com/v1/users/{id}`.
- **Cache:** `SLOW` (600s).
- **Example prompt:** *"Who is user 1?"*

### `get_group`

Fetch a group's metadata, member count, and owner.

```ts
{ groupId: number }
// → { group: Group }
```

- **Data source:** `groups.roblox.com/v1/groups/{id}`.
- **Cache:** `SLOW` (600s).
- **Example prompt:** *"How many members does group 7 have?"*

### `get_top_creators_by_genre`

Identify the most successful creators within a specific genre, ranked by
total CCU across their published games.

```ts
{ genre: string; limit?: number }
// → { creators: { id: number; name: string; type: "User" | "Group"; totalPlaying: number; totalVisits: number; gameCount: number }[] }
```

- **Data source:** aggregations over `get_top_by_genre` +
  `games.roblox.com/v2/users/{id}/games`.
- **Status:** in development for v0.1.
- **Example prompt:** *"Who are the top 10 Simulator creators by total
  player count?"*

---

## Calculators

### `calculate_devex`

Convert Robux to USD via the current DevEx rate.

```ts
{ robux: number }
// → { robux: number; usd: number; ratePerRobux: number; retrievedAt: string }
```

- **Data source:** static rate constant, refreshed via release.
- **Example prompt:** *"What's 100,000 Robux in USD?"*

### `estimate_game_revenue`

Estimate gross Robux revenue from visits, CCU, and monetization assumptions.

```ts
{
  visits: number;
  avgCcu: number;
  conversionRate: number; // 0..1, share of CCU that monetizes
  avgRevenuePerPayingUser: number; // Robux per paying user per session
}
// → { estimatedRobux: number; estimatedUsd: number; assumptions: { ... } }
```

- **Data source:** pure calculation; no external calls.
- **Example prompt:** *"Estimate monthly revenue for a game with 1M monthly
  visits, 800 avg CCU, 4% conversion, and 50 Robux ARPU."*

---

## Operational

### `snapshot_game`

Capture a point-in-time snapshot of a game into the local SQLite store.

```ts
{ universeId: number }
// → { universeId: number; snapshotId: string; capturedAt: string }
```

- **Data source:** `get_game` → SQLite at `~/.bloxscout/data.db`.
- **Status:** in development for v0.1.
- **Example prompt:** *"Take a snapshot of universe 920587237 right now."*

### `watch_games`

Schedule recurring snapshots for a set of games to build time-series.

```ts
{ universeIds: number[]; interval: string /* e.g. "1h" */; name?: string }
// → { watchlistId: string; nextRunAt: string }
```

- **Data source:** local snapshot store + a small scheduler.
- **Status:** in development for v0.1; cron-driven mode planned for v0.2.
- **Example prompt:** *"Watch these 5 games and snapshot every hour."*

---

## Reports

### `generate_market_report`

Produce a structured market report (Markdown + JSON) for a genre or
watchlist.

```ts
{
  genre?: string;
  watchlist?: string;
  format?: "markdown" | "json";
}
// → { markdown?: string; json?: object; coverage: { games: number; periodStart: string; periodEnd: string } }
```

- **Data source:** snapshot store + live `get_game` and
  `get_top_by_genre` calls.
- **Status:** in development for v0.1.
- **Example prompt:** *"Generate a market report for the Simulator genre
  covering the last 14 days."*

## See also

- [CLI Reference](./CLI-Reference.md) — the same surface from a shell.
- [Roblox Data Sources](./Roblox-Data-Sources.md) — every endpoint touched.
- [Snapshots and History](./Snapshots-and-History.md) — why several tools
  depend on the local snapshot store.
