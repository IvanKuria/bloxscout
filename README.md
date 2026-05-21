# bloxscout

> Reconnaissance for Roblox game devs and their agents.

[![npm version](https://img.shields.io/npm/v/bloxscout.svg)](https://www.npmjs.com/package/bloxscout)
[![CI](https://img.shields.io/github/actions/workflow/status/IvanKuria/bloxscout/ci.yml?branch=main&label=CI)](https://github.com/IvanKuria/bloxscout/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP Server](https://img.shields.io/badge/MCP-server-8A2BE2.svg)](https://modelcontextprotocol.io)

## What is Bloxscout?

Roblox developers operate one of the largest game platforms in the world, yet most market-intelligence tools they rely on (chiefly rotrends.com) have no public API. That means a developer cannot ask their AI agent simple questions like "which Simulator games are trending this week?", "how does my game's CCU compare to the genre median?", or "what would a 20,000 Robux DevEx payout net me in USD?" without leaving their editor, copy-pasting between tabs, and re-explaining context every time.

Bloxscout closes that gap. It is a single open-source TypeScript package that ships both a command-line tool (`bloxscout`) and a Model Context Protocol (MCP) stdio server (`bloxscout-mcp`). The MCP server exposes 18 tools across discovery, game intelligence, creator/community lookup, calculators, snapshots, and reports — all backed by Roblox's public unauthenticated endpoints and (optionally) Open Cloud for the user's own games. A local SQLite snapshot store at `~/.bloxscout/data.db` builds your own historical time-series over time, so trends become queryable even though Roblox doesn't expose them.

## Quick start (MCP)

Bloxscout is MCP-first — its primary user is an LLM agent inside Claude Code, Cursor, Windsurf, or Zed.

**Claude Code**

```sh
claude mcp add bloxscout -- npx -y bloxscout-mcp
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "bloxscout": {
      "command": "npx",
      "args": ["-y", "bloxscout-mcp"]
    }
  }
}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`)

```json
{
  "mcpServers": {
    "bloxscout": {
      "command": "npx",
      "args": ["-y", "bloxscout-mcp"]
    }
  }
}
```

**Zed** (`~/.config/zed/settings.json`)

```json
{
  "context_servers": {
    "bloxscout": {
      "command": {
        "path": "npx",
        "args": ["-y", "bloxscout-mcp"]
      }
    }
  }
}
```

Once registered, ask your agent things like *"Use bloxscout to find the top 10 trending Simulator games and tell me which ones are growing fastest week-over-week."*

## Quick start (CLI)

The CLI is a thin Commander wrapper over the same core, useful for shell scripts and one-offs.

```sh
npx bloxscout trending --genre Simulator --limit 10
npx bloxscout game 920587237 --history 30d
npx bloxscout devex 100000 --format json
```

## What can it do?

### Discovery

| Tool | Description |
| --- | --- |
| `search_games` | Search Roblox's catalog by keyword with optional genre and sort filters. |
| `get_trending_games` | Return games trending now, optionally filtered by genre. |
| `get_top_by_genre` | List the top games within a specific genre ranked by CCU or visits. |
| `get_up_and_coming` | Surface smaller games with unusually strong recent growth. |
| `discover_underserved_genres` | Identify genres with high player demand and low developer supply. |

### Game intelligence

| Tool | Description |
| --- | --- |
| `get_game` | Fetch a single game's full metadata: name, description, creator, stats, thumbnails. |
| `get_game_player_count` | Return current CCU and total visits for a given universe ID. |
| `get_game_history` | Read locally-stored historical snapshots for a game's CCU, visits, and likes. |
| `compare_games` | Side-by-side comparison of up to N games on the same metrics. |
| `analyze_game_vs_genre` | Compare one game against the median/percentile of its genre cohort. |

### Creator and community

| Tool | Description |
| --- | --- |
| `get_creator` | Look up a user or group creator with bio, follower count, and verification status. |
| `get_group` | Fetch a group's metadata, member count, and recent activity. |
| `get_top_creators_by_genre` | Identify the most successful creators within a specific genre. |

### Calculators

| Tool | Description |
| --- | --- |
| `calculate_devex` | Convert Robux to USD via the current DevEx rate. |
| `estimate_game_revenue` | Estimate gross Robux revenue from visits, CCU, and monetization assumptions. |

### Operational

| Tool | Description |
| --- | --- |
| `snapshot_game` | Capture a point-in-time snapshot of a game into the local SQLite store. |
| `watch_games` | Schedule recurring snapshots for a set of games to build time-series. |

### Reports

| Tool | Description |
| --- | --- |
| `generate_market_report` | Produce a structured market report (Markdown + JSON) for a genre or watchlist. |

## Data sources

Bloxscout reads from:

- `games.roblox.com` — game metadata, search, sort
- `presence.roblox.com` — live presence and CCU
- `groups.roblox.com` — group metadata
- `users.roblox.com` — user metadata
- `thumbnails.roblox.com` — game and creator thumbnails
- Roblox Open Cloud — optional, authenticated, only for games you own
- Local SQLite snapshot store at `~/.bloxscout/data.db` — for historical time-series you build yourself

> **Disclaimer:** Bloxscout is an unofficial tool. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Super League Enterprise / Rotrends. Data is sourced from Roblox's public unauthenticated endpoints (games.roblox.com, presence.roblox.com, groups.roblox.com, users.roblox.com).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), and look for issues tagged [`good first issue`](https://github.com/IvanKuria/bloxscout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## License

Licensed under the [MIT License](./LICENSE).

## Disclaimer

Bloxscout is an unofficial tool. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Super League Enterprise / Rotrends. Data is sourced from Roblox's public unauthenticated endpoints (games.roblox.com, presence.roblox.com, groups.roblox.com, users.roblox.com).
