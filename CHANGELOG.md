# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/IvanKuria/bloxscout/compare/HEAD
