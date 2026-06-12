# Hosted Historical Data

> How bloxscout gives every user real Roblox trend data with zero cold-start — and zero infrastructure cost.

## The problem it solves

Roblox exposes no historical CCU/visits data. Before v0.2, bloxscout's answer was a *local* SQLite snapshot store: useful, but every install started empty, so `get_trending_games` could only approximate "trending" with current CCU and `get_up_and_coming` returned nothing until you'd run snapshots for hours or days.

v0.2 adds a centrally-operated ingestion pipeline whose output is public data, so the first tool call on a fresh install already has days of history behind it.

## Architecture

```
GitHub Actions (cron */30) ──> pipeline/run.ts ──> bloxscout-data repo (static JSON)
                                                        │
                              raw.githubusercontent.com (CDN, no keys)
                                                        │
                     HostedDataClient (MCP server / CLI) ── merges with local SQLite
```

- **Worker:** `.github/workflows/ingest.yml` in this repo runs `pipeline/run.ts` every ~30 minutes and pushes the result to [IvanKuria/bloxscout-data](https://github.com/IvanKuria/bloxscout-data). Free on public repos; no servers.
- **Discovery:** Roblox's explore-api home-page sorts (Top Trending, Up-and-Coming, Top Playing Now, …) across a small device/country matrix, plus an omni-search keyword sweep on scheduled runs. Both nets merge into `v1/registry.json`; games unseen for 7 days with negligible CCU drop to a dormant tier (snapshotted once daily).
- **Snapshotting:** one batched `games.roblox.com/v1/games` pass over the registry (50 ids/request, backoff, descriptive User-Agent `bloxscout-ingest/<version>`).
- **Rollups (tiered retention):** raw per-run files are kept 48 h, hourly rollups 30 days, daily rollups forever; per-game serving shards (`v1/history/<universeId % 256>.json.gz`) are rebuilt daily.
- **Hot views (recomputed every run):** `v1/views/trending.json`, `up-and-coming.json`, `breakouts.json`, `genres.json` — pre-ranked so a tool call is a single cached GET.
- **Validation gate:** a run that fetched too few games or produced schema-invalid files exits non-zero and is *not* committed; a tracking issue is opened instead. `v1/meta.json#generatedAt` is the freshness probe.
- **History squash:** the data repo's git history is squashed weekly so it stays clonable.

## Client behavior

`HostedDataClient` (`src/core/hosted-data.ts`) does plain HTTPS GETs with LRU caching (views 300 s, shards 600 s, meta 60 s) and returns `null` on *any* failure — network, HTTP, gzip, JSON, schema. Tools treat hosted data as strictly additive:

| Tool | Hosted behavior | Fallback |
| --- | --- | --- |
| `get_trending_games` | real 24h-growth ranking, `source: "hosted"` | live current-CCU ranking, `source: "live"` |
| `get_up_and_coming` | hosted view (default inputs) | local store (`source: "local"`) |
| `get_game_history` | hosted hourly+daily merged with local rows | local-only |
| `get_breakout_games` | hosted z-score view | none (errors with guidance) |
| `get_genre_momentum` | hosted genre aggregates | none (errors with guidance) |

## Environment knobs

| Variable | Effect |
| --- | --- |
| `BLOXSCOUT_NO_HOSTED=1` | Disable all hosted reads (pure v0.1 behavior). |
| `BLOXSCOUT_HOSTED_BASE_URL` | Point at a mirror or fork of the dataset (must end with `/`). |

## Wire format

All files live under `/v1/` in the data repo and are documented in the
[bloxscout-data README](https://github.com/IvanKuria/bloxscout-data#readme).
Zod schemas for every file live in `src/shared/hosted-format.ts` and are
shared by the pipeline (producer) and `HostedDataClient` (consumer), so
format drift fails loudly at the boundary. Breaking changes go to `/v2/`;
within `/v1/` changes are additive only.

## Running the pipeline yourself

The dataset is open and the pipeline is in this repo — you can fork both:

```sh
pnpm install
pnpm ingest --data-dir /path/to/your-data-checkout --max-games 500
export BLOXSCOUT_HOSTED_BASE_URL="https://raw.githubusercontent.com/<you>/<your-data-repo>/main/"
```

`--max-games` caps the snapshot budget for experiments; `--skip-discovery`
reuses the existing registry; `--omni-sweep` forces the keyword sweep.
