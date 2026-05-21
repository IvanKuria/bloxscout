# Getting Started

This page gets you from zero to a working Bloxscout call in about five
minutes — either through your AI agent (MCP) or directly from a terminal (CLI).

## Prerequisites

- **Node.js 20 or newer.** Check with `node --version`. Bloxscout's
  `package.json` declares `"engines": { "node": ">=20" }`.
- A package manager is not required for end users — `npx` handles everything.
  Contributors use [pnpm](https://pnpm.io/); see
  [CONTRIBUTING.md](https://github.com/IvanKuria/bloxscout/blob/main/CONTRIBUTING.md).

## Install

You have two options. Most users want the first one.

### Option 1 — zero install (recommended)

Run any command via `npx`. The first invocation pulls the package; later runs
use the npx cache.

```sh
npx bloxscout --help
```

### Option 2 — global install

If you'd rather have `bloxscout` and `bloxscout-mcp` on your `PATH`:

```sh
npm install -g bloxscout
bloxscout --help
```

## Your first MCP call (Claude Code)

Bloxscout is MCP-first. Register the stdio server with your client of choice
(other clients are covered in [MCP Setup](./MCP-Setup.md)).

```sh
claude mcp add bloxscout -- npx -y bloxscout-mcp
```

Then open Claude Code and ask:

> Use bloxscout to search for "obby" games and tell me the top 5 by current
> player count.

You should see Claude invoke `search_games`, then format the results into a
short ranked list with universe IDs, names, and live CCU. Under the hood the
agent picks the right tool from the
[Tools Reference](./Tools-Reference.md); you do not have to name tools by hand.

## Your first CLI call

The CLI is a thin wrapper over the same core. Useful for shell scripts,
cron jobs, and quick one-offs:

```sh
npx bloxscout trending --limit 5
```

You'll get a small table of the top 5 trending games. Add `--json` for
machine-readable output you can pipe into `jq`.

## Where to go next

- [MCP Setup](./MCP-Setup.md) — configure Cursor, Windsurf, or Zed.
- [Tools Reference](./Tools-Reference.md) — the full catalog your agent can
  call.
- [CLI Reference](./CLI-Reference.md) — every command and flag.
- [FAQ](./FAQ.md) — rate limits, affiliation, data storage, contributing.
