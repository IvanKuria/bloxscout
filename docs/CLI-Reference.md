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

Flags: `--json`.

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

Top games right now, optionally scoped by genre. v0.1 ranks the live
omni-search top results by current `playing` CCU — true week-over-week
growth requires the v0.2 snapshot store.

```sh
npx bloxscout trending --genre simulator --limit 10
```

Flags: `--genre <name>`, `--limit <n>` (default 25), `--json`.

### `top`

Top games by genre, ranked by a chosen metric.

```sh
npx bloxscout top --genre adventure --rank-by visits --limit 20
```

Flags: `--genre <name>` (required), `--rank-by <playing|visits|favoritedCount>`
(default `playing`), `--limit <n>` (default 10), `--json`.

### `creators`

Top creators in a genre, ranked by summed CCU across their live top games.

```sh
npx bloxscout creators --genre simulator --limit 10
```

Flags: `--genre <name>` (required), `--limit <n>` (default 10), `--json`.

### `up-and-coming`

Smaller games with unusually strong recent growth. Reads the local snapshot
store — populate it first with `bloxscout snapshot --watch ...`.

```sh
npx bloxscout up-and-coming --min-baseline 1000 --limit 10
```

Flags: `--since <iso>`, `--min-baseline <n>` (default 5000), `--limit <n>`
(default 25), `--json`.

### `devex <robux>`

Convert Robux to USD via the current DevEx rate.

```sh
npx bloxscout devex 100000
npx bloxscout devex 30000 --rate 0.0035 --json
```

Flags: `--rate <r>` (USD/Robux override), `--json`. Warns on stderr when
below the 30,000-Robux DevEx payout minimum.

### `revenue`

Estimate monthly Robux + USD revenue from live CCU. All knobs overridable;
the disclaimer is always surfaced alongside the estimate.

```sh
npx bloxscout revenue --ccu 250000
npx bloxscout revenue --ccu 10000 --conversion-rate 0.03 --avg-robux 120 --json
```

Flags: `--ccu <n>` (required), `--visits <n>`, `--conversion-rate <0..1>`,
`--avg-robux <n>`, `--days <n>`, `--rate <r>`, `--json`.

### `snapshot <universeIds...>`

Capture a point-in-time snapshot of one or more games into the local SQLite
store. With `--watch`, stays in the foreground and re-snapshots on a fixed
interval until Ctrl-C.

```sh
npx bloxscout snapshot 920587237
npx bloxscout snapshot 920587237 142823291 --watch 300
```

Flags: `--watch <intervalSec>` (60-3600), `--json`. Stored under
`$BLOXSCOUT_DATA_DIR/data.db` (default `~/.bloxscout/data.db`). See
[Snapshots and History](./Snapshots-and-History.md).

### `report`

Generate a market report (Markdown body + structured JSON) for a Roblox
genre. Pretty mode prints the rendered Markdown as-is for piping into
`glow` / screenshots; JSON mode emits the full structured payload with top
games, aggregates, optional focus comparison, and notable creators.

```sh
npx bloxscout report --genre simulator
npx bloxscout report --genre rpg --focus 920587237 --limit 5 --json
```

Flags: `--genre <name>` (required), `--focus <universeId>`, `--limit <n>`
(1-20, default 10), `--json`.

## See also

- [Tools Reference](./Tools-Reference.md) — the same surface, exposed to
  agents.
- [Architecture](./Architecture.md) — how the CLI shares the core with the
  MCP server.
