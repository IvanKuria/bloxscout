# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-05-21

### Fixed

- `get_top_by_genre`, `get_top_creators_by_genre`, and (via composition) `generate_market_report` no longer reject genres outside an 8-item allowlist (#40). Real Roblox has a long tail of popular genres — tower-defense, anime, racing, tycoon, battlegrounds, etc. — that omni-search handles natively but the curated `SUPPORTED_GENRES` list never covered. The leftover allowlist gate was an adoption blocker.
- `RobloxClient.getGames` now batches at 50 universe ids per request instead of 100 (#36). Roblox tightened the per-request cap on `games.roblox.com/v1/games?universeIds=...` some time after v0.1.0 — 100-id batches now fail with `{"code":9,"message":"Too many universe IDs"}`. Any external caller passing more than 50 ids hit the same failure.

### Changed

- **Behavior change for `get_top_by_genre` and `get_top_creators_by_genre`**: these tools now accept any non-empty genre keyword. Known aliases (`rpg` → `role-playing`, `fps` → `shooter`, `tycoon` → `simulator`, etc.) still resolve to their canonical search query; unknown keywords pass through verbatim (after lower/hyphen normalization) to Roblox's omni-search. Tool descriptions updated to reflect the new contract.

## [0.1.1] - 2026-05-21

### Added

- `bloxscout trending` — CLI wrapper for `get_trending_games`; lists trending games optionally filtered by genre.
- `bloxscout top` — CLI wrapper for `get_top_by_genre`; ranks top genre games by `playing`, `visits`, or `favoritedCount`.
- `bloxscout report` — CLI wrapper for `generate_market_report`; prints the rendered markdown report (or full structured JSON via `--json`).
- `bloxscout devex <robux>` — CLI wrapper for `calculate_devex`; warns on stderr when below the 30,000-Robux payout minimum.
- `bloxscout revenue --ccu <n>` — CLI wrapper for `estimate_game_revenue`; pretty-prints inputs, outputs, and the disclaimer.
- `bloxscout up-and-coming` — CLI wrapper for `get_up_and_coming`; prints a helpful stderr hint when the local snapshot store is empty.
- `bloxscout creators --genre <g>` — CLI wrapper for `get_top_creators_by_genre`.
- `bloxscout snapshot <universeIds...>` — CLI wrapper for `snapshot_game`; supports `--watch <intervalSec>` for a long-running scheduler driven by `SnapshotScheduler`.
- `runCli` gains a `storeFactory` injection point so snapshot-aware commands can be unit-tested without touching the real SQLite file.
- Shared `printText` formatter for commands whose pretty output is pre-rendered prose (used by `report`).

### Fixed

- README CLI quickstart examples now match real commands; the v0.1.0 snippets (`--history 30d`, `--format json`) referred to flags that were never implemented.
- `docs/CLI-Reference.md` updated to document every shipped command and remove the "planned" sections for v0.1.1-shipped tools.

## [0.1.0] - 2026-05-21

Initial public release of Bloxscout: an open-source TypeScript MCP server + CLI that gives Roblox developers and their AI agents programmatic access to Roblox game analytics.

### Added

**CLI (`bloxscout`)**
- 7 commands wrapping the Phase 1 Roblox client: `search`, `game`, `players`, `compare`, `creator`, `group`, `icon`.
- Global flags: `--json` (raw JSON output), `--pretty` (indent JSON), `--no-color` (disable ANSI), `-v` / `--version`.
- Shared `cli-table3` + `chalk` formatter with table and key:value layouts and a structured error printer.
- Stable exit-code policy: 0 success, 1 validation error, 2 Roblox API error, 3 internal.

**MCP server (`bloxscout-mcp`)**
- Stdio server built on `@modelcontextprotocol/sdk` v1, exposing `tools/list` and `tools/call` with JSON Schema generated from Zod input schemas.
- Single shared `RobloxClient` instance per server lifetime so the LRU cache is shared across tool calls.
- Default `SnapshotStore` constructed at startup (overridable via the `store` option or `BLOXSCOUT_DATA_DIR` env var).
- Errors trapped and returned as `{ isError: true }` payloads — the server never crashes on a tool failure.

**18 MCP tools across 6 categories**

*Discovery*
- `search_games` — keyword search via Roblox's omni-search.
- `get_trending_games` — top games by current CCU, optionally filtered by genre.
- `get_top_by_genre` — per-genre leaderboard sourced live from Roblox omni-search and ranked by `playing` / `visits` / `favoritedCount`.

*Game intelligence*
- `get_game` — full metadata for one universe ID.
- `get_game_player_count` — live CCU + lifetime visits.
- `compare_games` — side-by-side comparison of 2–10 games with min/max/median summary.
- `analyze_game_vs_genre` — target game vs cohort median / 75th percentile / max with per-metric percentile.

*Creator and community*
- `get_creator` — user-style creator profile.
- `get_group` — group metadata.
- `get_game_icons` — thumbnails for up to 100 games at a chosen size.
- `get_top_creators_by_genre` — ranks creators by summed CCU across the top games in a genre.

*Calculators*
- `calculate_devex` — Robux → USD using the current DevEx rate (0.0038 USD/Robux), with a `payoutMinimumNotMet` flag at 30,000 Robux.
- `estimate_game_revenue` — heuristic monthly revenue from CCU with explicit assumptions and a prominent disclaimer.

*Operational / snapshots*
- `snapshot_game` — capture a point-in-time snapshot of one or more games into the local SQLite store.
- `get_game_history` — read snapshot history for a universe, newest first.
- `get_up_and_coming` — rank small-baseline games by growth-rate over the snapshot window.
- `watch_games` — non-blocking background watch that spawns an in-process `SnapshotScheduler` and returns a `watchId`. Supports `action: "start" | "stop" | "status"`. Watches live for the duration of the MCP server process; use `bloxscout snapshot --cron` for durable scheduled snapshots.

*Synthesis*
- `generate_market_report` — internally calls `get_top_by_genre` (and optionally `analyze_game_vs_genre`) and returns both a rendered markdown report and a structured JSON payload with top games, aggregates, optional focus comparison, and notable creators.

**Core libraries**
- `RobloxClient` (`src/core/roblox-client.ts`) — typed HTTP client for Roblox's public unauthenticated endpoints (`games.roblox.com`, `apis.roblox.com/search-api/omni-search`, `groups.roblox.com`, `users.roblox.com`, `thumbnails.roblox.com`). LRU cache with per-domain TTL presets (LIVE 60s, DEFAULT 300s, SLOW 600s), exponential backoff + jitter on 5xx/429, honors `Retry-After`. Configurable User-Agent.
- `BloxscoutCache` (`src/core/cache.ts`) — LRU wrapper with in-flight deduplication so concurrent calls for the same key share one loader promise.
- `SnapshotStore` (`src/core/snapshots.ts`) — SQLite-backed time-series store at `~/.bloxscout/data.db` (overridable via `BLOXSCOUT_DATA_DIR`). Records `playing` / `visits` / `favoritedCount` plus game metadata; uses prepared statements + WAL.
- `SnapshotScheduler` (`src/core/scheduler.ts`) — in-process `setInterval` poller that periodically writes snapshots, with per-tick error handling. Backs `bloxscout snapshot --cron` and the `watch_games` tool.
- Rankings (`src/core/rankings.ts`) — `computeTrending`, `computeUpAndComing`, `computeGrowthSeries` derive growth metrics from snapshot history.
- Calculators (`src/core/calculators.ts`) — pure-function DevEx and revenue estimators.
- Top creators (`src/core/top-creators.ts`) — aggregates creator CCU across live top games in a genre.
- Typed error hierarchy (`src/shared/errors.ts`) — `BloxscoutError`, `RobloxApiError`, `RobloxRateLimitError`, `RobloxNotFoundError`, with `mapToMcpError` for the MCP error contract.
- Zod schemas for every tool's input and output (`src/shared/schemas.ts`).

**Repository infrastructure**
- MIT LICENSE, README, CONTRIBUTING, CODE_OF_CONDUCT (Contributor Covenant 2.1), SECURITY, issue templates (bug, feature request, MCP tool proposal), PR template.
- Dependabot weekly updates for npm and GitHub Actions.
- GitHub Actions: CI matrix on Node 20 + 22 × Ubuntu / macOS / Windows; release workflow on `v*.*.*` tags; nightly integration workflow against real Roblox endpoints.
- Branch protection on `main` with required CI checks and linear history.
- 9-page wiki source under `docs/`: Home, Getting-Started, MCP-Setup, CLI-Reference, Tools-Reference, Architecture, Roblox-Data-Sources, Snapshots-and-History, FAQ.

**Test coverage**
- 190 tests across 26 files (unit + integration). Integration tests gated by `INTEGRATION=1` and run nightly against real Roblox endpoints.

[Unreleased]: https://github.com/IvanKuria/bloxscout/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/IvanKuria/bloxscout/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/IvanKuria/bloxscout/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/IvanKuria/bloxscout/releases/tag/v0.1.0
