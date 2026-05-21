# Bloxscout Wiki

> Reconnaissance for Roblox game devs and their agents.

Bloxscout is an open-source TypeScript package that ships both a command-line
tool (`bloxscout`) and a Model Context Protocol (MCP) stdio server
(`bloxscout-mcp`). The MCP server exposes 18 tools across discovery, game
intelligence, creator/community lookup, calculators, snapshots, and reports —
all backed by Roblox's public unauthenticated endpoints and (optionally)
Open Cloud for games you own.

Roblox developers operate one of the largest game platforms in the world, yet
most market-intelligence tools they rely on have no public API. Bloxscout
closes that gap so a developer can ask their AI agent simple questions like
"which Simulator games are trending this week?" or "how does my game's CCU
compare to the genre median?" without leaving their editor. A local SQLite
snapshot store at `~/.bloxscout/data.db` builds your own historical time-series
over time, so trends become queryable even though Roblox doesn't expose them.

## Navigation

- [Getting Started](./Getting-Started.md) — five-minute install and first call.
- [MCP Setup](./MCP-Setup.md) — per-client integration for Claude Code, Cursor,
  Windsurf, and Zed.
- [CLI Reference](./CLI-Reference.md) — every command, flag, and environment
  variable.
- [Tools Reference](./Tools-Reference.md) — full reference for the 18 MCP tools
  agents call.
- [Architecture](./Architecture.md) — how the core library, cache, retry, and
  transports fit together.
- [Roblox Data Sources](./Roblox-Data-Sources.md) — every endpoint we hit, and
  everything we deliberately do not.
- [Snapshots and History](./Snapshots-and-History.md) — the local time-series
  store (planned for v0.2).
- [FAQ](./FAQ.md) — common questions about affiliation, rate limits,
  contributions, and more.

## Project status

Bloxscout is in early development. Phase 1 (core Roblox client, cache, retry,
schemas) is in `main`; the MCP server, CLI, and snapshot store land in
subsequent phases targeting v0.1. Pages on this wiki call out anything that is
not yet wired up.

---

**Disclaimer.** Bloxscout is an unofficial tool. It is not affiliated with,
endorsed by, or sponsored by Roblox Corporation or Super League Enterprise /
Rotrends. Data is sourced from Roblox's public unauthenticated endpoints.
