# bloxscout

> Reconnaissance for Roblox game devs and their agents.

[![npm version](https://img.shields.io/npm/v/bloxscout.svg)](https://www.npmjs.com/package/bloxscout)
[![CI](https://img.shields.io/github/actions/workflow/status/IvanKuria/bloxscout/ci.yml?branch=main&label=CI)](https://github.com/IvanKuria/bloxscout/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP Server](https://img.shields.io/badge/MCP-server-8A2BE2.svg)](https://modelcontextprotocol.io)

## What is Bloxscout?

Roblox developers operate one of the largest game platforms in the world, yet most market-intelligence tools they rely on (chiefly rotrends.com) have no public API. That means a developer cannot ask their AI agent simple questions like "which Simulator games are trending this week?", "how does my game's CCU compare to the genre median?", or "what would a 20,000 Robux DevEx payout net me in USD?" without leaving their editor, copy-pasting between tabs, and re-explaining context every time.

Bloxscout closes that gap. It is a single open-source TypeScript package that ships both a command-line tool (`bloxscout`) and a Model Context Protocol (MCP) stdio server (`bloxscout-mcp`). The MCP server exposes 20 tools across discovery, game intelligence, creator/community lookup, calculators, snapshots, and reports — all backed by Roblox's public unauthenticated endpoints and (optionally) Open Cloud for the user's own games.

**New in v0.2: hosted historical data.** Bloxscout runs an open ingestion pipeline that snapshots thousands of popular Roblox games every ~30 minutes and publishes the rollups as static JSON in the public [bloxscout-data](https://github.com/IvanKuria/bloxscout-data) repo. The tools read it over plain HTTPS — so `get_trending_games` returns *real 24h/7d growth* from your very first call, `get_breakout_games` flags statistically anomalous CCU spikes, and `get_genre_momentum` shows which niches are rising — with no API key, no signup, and no waiting for a local store to fill up. The local SQLite snapshot store (`~/.bloxscout/data.db`) is still there for niche games the pipeline doesn't track and for finer-grained windows; everything degrades gracefully to local/live behavior when you're offline (or set `BLOXSCOUT_NO_HOSTED=1`).

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
npx bloxscout search "tower defense" --limit 5
npx bloxscout trending --genre simulator --limit 10
npx bloxscout breakouts --min-z 3
npx bloxscout momentum --sort-by growth7dPct
npx bloxscout report --genre rpg --limit 5
npx bloxscout devex 100000
npx bloxscout revenue --ccu 250000
```

## What can it do?

### Discovery

| Tool | Description |
| --- | --- |
| `search_games` | Search Roblox's catalog by keyword with optional genre and sort filters. |
| `get_trending_games` | Rank games by real 24h CCU growth (hosted dataset), with a live current-CCU fallback. |
| `get_top_by_genre` | List the top games within a specific genre ranked by CCU or visits. |
| `get_up_and_coming` | Surface smaller games with unusually strong recent growth. |
| `get_breakout_games` | Detect games whose trailing-24h CCU is statistically anomalous vs their own prior week. |
| `get_genre_momentum` | Rank genres by momentum: summed CCU plus 24h/7d growth of the genre as a whole. |

### Game intelligence

| Tool | Description |
| --- | --- |
| `get_game` | Fetch a single game's full metadata: name, description, creator, stats, thumbnails. |
| `get_game_player_count` | Return current CCU and total visits for a given universe ID. |
| `get_game_history` | Historical CCU/visits/favorites for a game — hosted dataset merged with your local snapshots. |
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
- `apis.roblox.com` — omni-search and explore-api discovery sorts
- `groups.roblox.com` — group metadata
- `users.roblox.com` — user metadata
- `thumbnails.roblox.com` — game and creator thumbnails
- [bloxscout-data](https://github.com/IvanKuria/bloxscout-data) — open hosted dataset of historical game metrics (static JSON over GitHub's CDN; refreshed ~every 30 min; opt out with `BLOXSCOUT_NO_HOSTED=1`, mirror with `BLOXSCOUT_HOSTED_BASE_URL`)
- Roblox Open Cloud — optional, authenticated, only for games you own
- Local SQLite snapshot store at `~/.bloxscout/data.db` — for historical time-series you build yourself

> **Disclaimer:** Bloxscout is an unofficial tool. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Super League Enterprise / Rotrends. Data is sourced from Roblox's public unauthenticated endpoints (games.roblox.com, presence.roblox.com, groups.roblox.com, users.roblox.com).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), and look for issues tagged [`good first issue`](https://github.com/IvanKuria/bloxscout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## License

Licensed under the [MIT License](./LICENSE).

## Disclaimer

Bloxscout is an unofficial tool. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Super League Enterprise / Rotrends. Data is sourced from Roblox's public unauthenticated endpoints (games.roblox.com, presence.roblox.com, groups.roblox.com, users.roblox.com).
