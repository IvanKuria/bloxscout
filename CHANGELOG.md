# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- All 16 MCP tools (10 from Phase 2 + 6 from Phase 4/5a) are now registered in the server's tool router. Previously, snapshot_game, get_game_history, get_up_and_coming, calculate_devex, estimate_game_revenue, and get_top_creators_by_genre were defined but unwired.
- MCP server constructs a default SnapshotStore at startup (overridable via the `store` option) and passes it to handlers via ToolContext.
- MCP stdio server entry point (`bloxscout-mcp`) now boots a real `@modelcontextprotocol/sdk` v1 server with `tools/list` + `tools/call` handlers, JSON Schema generated from the Zod input schemas, and a single shared `RobloxClient` instance per process.
- First 10 MCP tools, each with an LLM-targeted description and structured JSON output:
  - `search_games` — keyword search via Roblox's omni-search.
  - `get_trending_games` — v0.1 CCU-ranked fallback over a curated seed list (true trending lands in v0.2 with the snapshot store).
  - `get_top_by_genre` — curated per-genre seed list, ranked by `playing` / `visits` / `favoritedCount`.
  - `get_game` — full metadata for one universe id.
  - `get_game_player_count` — live CCU + lifetime visits.
  - `compare_games` — side-by-side detail for 2-10 games with min/max/median summary.
  - `analyze_game_vs_genre` — target game vs cohort median / 75th percentile / max with per-metric percentile.
  - `get_creator` — user-style creator profile.
  - `get_group` — group metadata.
  - `get_game_icons` — thumbnails for up to 100 games at a chosen size.
- Tool registry (`src/mcp/tools/index.ts`) and per-genre seed data (`src/mcp/data/genre-seeds.ts`).
- Initial project scaffold: TypeScript ESM package, MCP stdio server bin (`bloxscout-mcp`), CLI bin (`bloxscout`).
- Repository infrastructure: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and PR templates, Dependabot, GitHub Actions CI / release / nightly integration workflows.
- CLI commands wrapping the Phase 1 Roblox client 1:1: `search`, `game`, `players`, `compare`, `creator`, `group`, `icon`.
- Global CLI flags: `--json` (raw JSON output), `--pretty` (indent JSON), `--no-color` (disable ANSI), `-v, --version`.
- Shared `cli-table3` + `chalk` formatter (`src/cli/format.ts`) with table and key:value layouts, plus a structured error printer.
- Stable exit-code policy: 0 success, 1 validation error, 2 Roblox API error, 3 internal.
- `SnapshotStore` (`src/core/snapshots.ts`): SQLite-backed time-series store for Roblox game state, persisted at `~/.bloxscout/data.db` by default (overridable via `BLOXSCOUT_DATA_DIR`). Records `playing` / `visits` / `favoritedCount` per universe plus game metadata.
- Rankings module (`src/core/rankings.ts`): `computeTrending`, `computeUpAndComing`, and `computeGrowthSeries` derive growth metrics from snapshot history.
- `SnapshotScheduler` (`src/core/scheduler.ts`): in-process `setInterval` poller that periodically writes snapshots — backs `bloxscout snapshot --cron` and the MCP `watch_games` flow.
- MCP tool descriptors: `snapshot_game`, `get_game_history`, `get_up_and_coming` under `src/mcp/tools/` (awaiting wiring in `src/mcp/server.ts` by Phase 2).
- Pure-function DevEx and revenue calculators in `src/core/calculators.ts`: `calculateDevex` (default rate 0.0038 USD per Robux, payout-minimum flag at 30,000 Robux) and `estimateGameRevenue` (heuristic monthly revenue from CCU with explicit assumptions and a prominent disclaimer).
- Curated per-genre game seed map in `src/core/seed-data.ts`, shared by Phase 5a's `get_top_creators_by_genre` and reusable by Phase 2's `get_top_by_genre`.
- `getTopCreatorsByGenre` aggregation in `src/core/top-creators.ts`: ranks creators by summed CCU across the seed list for a given genre.
- MCP tools `calculate_devex`, `estimate_game_revenue`, and `get_top_creators_by_genre` in `src/mcp/tools/`, each with LLM-ready descriptions and Zod-derived JSON input/output schemas.
- Zod schemas for the three new tools, appended to `src/shared/schemas.ts`.
- Phase 5b MCP tools:
  - `watch_games` — non-blocking background watch that spawns an in-process `SnapshotScheduler` per call and returns a `watchId`. Supports `action: "start" | "stop" | "status"`. Watches live only as long as the MCP server process; use the `bloxscout snapshot --cron` CLI for durable scheduled snapshots.
  - `generate_market_report` — synthesis tool that internally calls `get_top_by_genre` (and optionally `analyze_game_vs_genre`) and returns both a rendered markdown report and a structured JSON payload (top games, aggregates, optional focus comparison, notable creators).
- `ToolContext` now carries an optional `store?: SnapshotStore` so tools that read or write the local snapshot DB can be injected with a shared store.

### Fixed

- get_top_by_genre, get_top_creators_by_genre, and generate_market_report now use live Roblox omni-search instead of hardcoded universe IDs. The previous seed lists contained wrong IDs that returned template games with 0 CCU. (#34)
- test:integration script no longer silently exits 0 with no tests run. (#29)

[Unreleased]: https://github.com/IvanKuria/bloxscout/compare/HEAD
