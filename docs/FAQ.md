# FAQ

## How is this different from rotrends?

Rotrends is a closed, web-only analytics product with no public API. Bloxscout
is an open-source command-line tool and MCP server you run locally — your
data, your machine, your agent. We do not scrape rotrends; Bloxscout reads
Roblox's own public endpoints directly. See
[Roblox Data Sources](./Roblox-Data-Sources.md) for the exact list.

The functional overlap is genuine: both surfaces trend games, look up
creators, and produce reports. The difference is integration. Bloxscout is
built so your AI agent can call it directly inside Claude Code, Cursor,
Windsurf, or Zed — no copy-paste from a dashboard.

## Is this affiliated with Roblox or Super League?

No. Bloxscout is an independent, unofficial open-source project under the
MIT license. It is not affiliated with, endorsed by, or sponsored by Roblox
Corporation or Super League Enterprise / Rotrends. Roblox, Robux, and related
marks are trademarks of Roblox Corporation.

## Why TypeScript and not Rust / Go / Python?

Three reasons:

1. **MCP ecosystem.** The reference MCP SDK is TypeScript; most MCP servers
   in the wild are TypeScript; client integration patterns (`npx -y
   bloxscout-mcp`) match what every client documents.
2. **Zero-install distribution.** Node + `npx` is universally available and
   doesn't require users to download a platform-specific binary.
3. **Schema sharing.** Zod schemas in `src/shared/schemas.ts` are the
   single source of truth for both MCP JSON Schema and CLI flag validation —
   no codegen, no manual sync.

## Can I use this without an MCP client?

Yes. The CLI (`bloxscout`) is a first-class surface. Every MCP tool has a
matching CLI subcommand — see [CLI Reference](./CLI-Reference.md). The CLI is
the right choice for shell scripts, cron jobs, CI checks, or quick manual
inspection.

## Will this get me rate-limited by Roblox?

Almost certainly not under normal use. Bloxscout is built to be a polite
client:

- Aggressive LRU caching with TTL buckets (`LIVE` 60s, `DEFAULT` 300s,
  `SLOW` 600s).
- In-flight de-duplication so concurrent identical requests fan in to one.
- Exponential backoff with full jitter on 5xx and 429.
- Honors `Retry-After` exactly when Roblox sends it.
- Stable identifying User-Agent
  (`bloxscout/0.0.1 (+https://github.com/IvanKuria/bloxscout)`).

If you build an unusually hot workload (e.g. snapshotting tens of thousands
of universes per minute) you should add your own scheduling and possibly
sit behind a shared cache. The
[Architecture page](./Architecture.md#extension-points) covers swapping the
cache backend.

## Can I contribute a new tool?

Yes — new tools are explicitly called out as the highest-leverage
contribution in
[CONTRIBUTING.md](https://github.com/IvanKuria/bloxscout/blob/main/CONTRIBUTING.md).
Open an issue using the **New MCP tool proposal** template first; a
maintainer will sign off on the design before implementation begins. The
[Architecture page](./Architecture.md#adding-a-new-tool) walks through the
implementation checklist.

## Does it work in CI / scripts?

Yes. Use the CLI with `--json` for stable output, redirect into `jq`, and
gate on exit codes. Example:

```sh
ccu=$(npx bloxscout players 920587237 --json | jq '.playing')
if [ "$ccu" -lt 100 ]; then
  echo "CCU dropped below 100" >&2
  exit 1
fi
```

Bloxscout makes no interactive prompts and writes only to stdout (data) and
stderr (logs / progress).

## Where is data stored locally?

- **Snapshot database:** `~/.bloxscout/data.db` (SQLite). Override with
  `BLOXSCOUT_DATA_DIR`. See
  [Snapshots and History](./Snapshots-and-History.md) for backup and reset
  instructions.
- **In-memory cache:** Process-local LRU, 1000 entries by default,
  discarded when the CLI / MCP server exits.
- **Configuration:** None on disk. All configuration is via environment
  variables (documented in [CLI Reference](./CLI-Reference.md#environment-variables)).
- **Credentials:** Only `ROBLOX_OPEN_CLOUD_API_KEY`, read from the
  environment. Never written to disk by Bloxscout.

## I have a question that isn't covered here.

Open a [GitHub Discussion](https://github.com/IvanKuria/bloxscout/discussions)
or file an issue. Security reports go to
[SECURITY.md](https://github.com/IvanKuria/bloxscout/blob/main/SECURITY.md).
