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

[Unreleased]: https://github.com/IvanKuria/bloxscout/compare/HEAD
