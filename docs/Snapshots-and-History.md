# Snapshots and History

> **v0.2 update:** you no longer *need* the local store to get history.
> Bloxscout now ships a hosted dataset of historical metrics for thousands
> of popular games, refreshed every ~30 minutes, that `get_game_history`,
> `get_trending_games`, `get_up_and_coming`, `get_breakout_games`, and
> `get_genre_momentum` read automatically. The local snapshot store
> described below remains the right tool for niche games the pipeline
> doesn't track and for finer-than-hourly windows. See
> [Hosted-Data](./Hosted-Data.md).

## What the snapshot store is

A local SQLite database — `~/.bloxscout/data.db` by default, overridable via
`BLOXSCOUT_DATA_DIR` — that records the state of a game at a point in time.
Each snapshot captures the fields Roblox returns from
`games.roblox.com/v1/games` (CCU, visits, favorites, likes, etc.) plus a
capture timestamp.

We use [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) for
synchronous embedded access and zero-config setup. The database is created on
first write; no migrations to run by hand.

## Why it matters

Roblox does not expose historical CCU or visits. The public endpoints only
return *current* values. Without a local store you cannot answer:

- "Is this game's CCU trending up or down week-over-week?"
- "Which smaller Tycoon games doubled their daily visits in the last 14 days?"
- "What was my game's median CCU during the holiday push?"

Bloxscout builds that history yourself, on your machine, by snapshotting on
demand or on a schedule. Once you have a few days of snapshots, the
trending and up-and-coming tools become useful; with weeks, the
`generate_market_report` tool can produce meaningful trend lines.

## Tools that depend on it

| Tool | How it uses the store |
| --- | --- |
| `snapshot_game` | Writes a single capture for one universe. |
| `watch_games` | Schedules recurring captures for a set of universes. |
| `get_game_history` | Reads back the time-series for one universe with optional window and granularity. |
| `get_trending_games` | Ranks games by short-window CCU growth. |
| `get_up_and_coming` | Filters for smaller games with abnormal growth. |
| `generate_market_report` | Aggregates the store + live calls into a Markdown / JSON report. |

Before the snapshot store ships, every tool above returns a
`NOT_IMPLEMENTED` MCP error that explains the dependency.

## Operational notes

### Manual capture

```sh
npx bloxscout snapshot 920587237
```

Cheap. Idempotent within a minute (the underlying `get_game` call hits the
600s `SLOW` cache).

### Scheduled capture (cron)

For now (until `watch_games` ships with its own scheduler), drive snapshots
from your platform's scheduler:

```cron
# Every hour, at minute 5
5 * * * * /usr/bin/env -i HOME=$HOME PATH=/usr/local/bin:/usr/bin npx bloxscout snapshot 920587237 >> /tmp/bloxscout.log 2>&1
```

The CLI's environment variables (`BLOXSCOUT_DATA_DIR`, `BLOXSCOUT_USER_AGENT`)
work identically under cron — pass them explicitly via `env` if your crontab
inherits a minimal environment.

### Backup

The database is a single file. Standard SQLite backup techniques apply:

```sh
# Cold copy (when no process is writing)
cp ~/.bloxscout/data.db ~/.bloxscout/data.db.bak

# Hot copy (safe under writes)
sqlite3 ~/.bloxscout/data.db ".backup ~/.bloxscout/data.db.bak"
```

### Sharing snapshots across machines

For v0.1 the recommended workflow is "copy the file." A planned v0.2 feature
will add `bloxscout snapshot export` and `bloxscout snapshot import` for
range-scoped JSON exchange so teams can pool history without sharing the
entire database. See the
[discussion on GitHub](https://github.com/IvanKuria/bloxscout/discussions)
to weigh in on the design.

### Resetting

```sh
rm ~/.bloxscout/data.db
```

Bloxscout recreates the file on the next snapshot.

## Schema (planned)

Subject to change before v0.2, but the working shape is:

```sql
CREATE TABLE game_snapshots (
  universe_id   INTEGER NOT NULL,
  captured_at   TEXT NOT NULL,           -- ISO-8601 UTC
  playing       INTEGER NOT NULL,
  visits        INTEGER NOT NULL,
  favorites     INTEGER NOT NULL,
  up_votes      INTEGER NOT NULL,
  down_votes    INTEGER NOT NULL,
  genre         TEXT,
  PRIMARY KEY (universe_id, captured_at)
);

CREATE INDEX idx_snapshots_captured ON game_snapshots (captured_at);
CREATE INDEX idx_snapshots_genre    ON game_snapshots (genre, captured_at);
```

## See also

- [Tools Reference](./Tools-Reference.md) — every tool that touches the
  snapshot store.
- [Architecture](./Architecture.md) — where the store sits in the system.
- [CLI Reference](./CLI-Reference.md#snapshot-universeid) — `snapshot`,
  `watch`, and `report` commands.
