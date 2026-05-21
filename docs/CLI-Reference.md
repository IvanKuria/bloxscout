# CLI Reference

The `bloxscout` CLI is a thin Commander wrapper over the same core library
that powers the MCP server. It exists for shell scripts, cron jobs, and quick
one-offs. Every command supports `--help`.

> All example outputs on this page are illustrative — they show realistic
> shapes for documentation, not live data.

## Global flags

| Flag | Description |
| --- | --- |
| `--json` | Emit JSON to stdout instead of formatted tables. Stable shape, safe to pipe into `jq`. |
| `--no-color` | Disable ANSI color codes. Honors `NO_COLOR` and `FORCE_COLOR` as well. |
| `--version` | Print the installed version and exit. |
| `--help` | Print help for the root command or a subcommand. |

Planned for v0.2: `--cache-dir <path>`, `--data-dir <path>`,
`--user-agent <string>`, `--no-cache`. See the
[tracking milestone](https://github.com/IvanKuria/bloxscout/milestones) on
GitHub.

## Environment variables

| Variable | Effect |
| --- | --- |
| `BLOXSCOUT_USER_AGENT` | Override the default `bloxscout/0.0.1 (+https://github.com/IvanKuria/bloxscout)` User-Agent. |
| `BLOXSCOUT_CACHE_DIR` | Directory for the persistent cache backend (when introduced; in-memory LRU today). |
| `BLOXSCOUT_DATA_DIR` | Directory for the SQLite snapshot store. Defaults to `~/.bloxscout`. |
| `ROBLOX_OPEN_CLOUD_API_KEY` | API key for Roblox Open Cloud calls (only required for tools that touch the user's own games). |
| `INTEGRATION` | Set to `1` to run the contributor integration test suite against live Roblox endpoints. |

## Commands

### `search <keyword>`

Search Roblox's catalog by keyword.

```sh
npx bloxscout search obby --limit 5
```

Flags: `--limit <n>` (default 25, max 100), `--json`.

Sample output:

```
NAME                       UNIVERSE ID   CCU       CREATOR
Tower of Hell              4974551500    142,103   YXCeptional Studios
Mega Easy Obby             5460341145    18,420    Maddox Smith
...
```

### `game <universeId>`

Fetch full metadata for a single game.

```sh
npx bloxscout game 920587237 --json
```

Flags: `--history <duration>` (planned, reads snapshots), `--json`.

### `players <universeId>`

Live CCU and total visits.

```sh
npx bloxscout players 920587237
```

Sample output:

```
universe_id: 920587237
playing:     12,884
visits:      1,402,103,558
```

### `compare <id1> <id2> [...ids]`

Side-by-side comparison of 2–10 games.

```sh
npx bloxscout compare 920587237 4974551500 --json
```

### `creator <userId>`

Look up a user creator's profile, bio, and verification badge.

```sh
npx bloxscout creator 1
```

### `group <groupId>`

Group metadata, owner, member count.

```sh
npx bloxscout group 7
```

### `icon <universeId>`

Return the canonical thumbnail URL for a game.

```sh
npx bloxscout icon 920587237 --size 512x512
```

Flags: `--size <WxH>` (default `512x512`).

### `trending`

Top games right now, optionally scoped by genre.

```sh
npx bloxscout trending --genre Simulator --limit 10
```

Flags: `--genre <name>`, `--limit <n>` (default 20), `--json`.

> Status: depends on the snapshot store (planned v0.2). Until then this
> command short-circuits to a clear `NOT_IMPLEMENTED` error explaining
> what's missing.

### `top`

Top games by genre, ranked by a chosen metric.

```sh
npx bloxscout top --genre Adventure --rank-by visits --limit 20
```

Flags: `--genre <name>` (required), `--rank-by <playing|visits|favoritedCount>`
(default `playing`), `--limit <n>`, `--json`.

### `up-and-coming`

Smaller games with unusually strong recent growth. Reads the local snapshot
store.

```sh
npx bloxscout up-and-coming --genre RPG --window 7d
```

Flags: `--genre`, `--window <duration>`, `--limit <n>`, `--json`.

### `devex <robux>`

Convert Robux to USD via the current DevEx rate.

```sh
npx bloxscout devex 100000 --format json
```

Flags: `--format <text|json>` (alias for `--json`).

Sample output:

```
100,000 Robux → $350.00 USD (rate: 0.0035 USD/Robux, retrieved 2026-05-21)
```

### `revenue`

Estimate gross Robux revenue from visits, CCU, and monetization assumptions.

```sh
npx bloxscout revenue --visits 1000000 --avg-ccu 800 --conversion 0.04 --arpu 50
```

Flags: `--visits`, `--avg-ccu`, `--conversion <0..1>`, `--arpu <robux>`,
`--json`.

### `snapshot <universeId>`

Capture a point-in-time snapshot of a game into the local SQLite store.

```sh
npx bloxscout snapshot 920587237
```

Stored under `$BLOXSCOUT_DATA_DIR/data.db` (default `~/.bloxscout/data.db`).
See [Snapshots and History](./Snapshots-and-History.md).

### `watch`

Schedule recurring snapshots for a set of games.

```sh
npx bloxscout watch add 920587237 4974551500 --every 1h
npx bloxscout watch list
npx bloxscout watch remove 920587237
```

> Status: planned for v0.2.

### `report`

Generate a structured market report (Markdown + JSON) for a genre or
watchlist.

```sh
npx bloxscout report --genre Simulator --out ./simulator-2026-05.md
```

Flags: `--genre`, `--watchlist <name>`, `--out <path>`, `--format <md|json>`.

## See also

- [Tools Reference](./Tools-Reference.md) — the same surface, exposed to
  agents.
- [Architecture](./Architecture.md) — how the CLI shares the core with the
  MCP server.
