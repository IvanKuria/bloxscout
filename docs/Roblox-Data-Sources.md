# Roblox Data Sources

Bloxscout reads exclusively from Roblox's public, unauthenticated HTTP
endpoints and (optionally) Roblox Open Cloud for games you own. This page
documents every URL we hit, what we read, how aggressively we cache, and —
just as importantly — what we deliberately do not touch.

## Public endpoints we use

| URL | What we read | Auth required? | Our cache TTL |
| --- | --- | --- | --- |
| `https://apis.roblox.com/search-api/omni-search` | Keyword search for games. | No | 300s (`DEFAULT`) |
| `https://apis.roblox.com/explore-api/v1/get-sorts` | Home-page discovery sorts (Top Trending, Up-and-Coming, Top Playing Now, …) with live `playerCount` inline. Undocumented but unauthenticated; used by `RobloxClient.getExploreSorts` and the ingestion pipeline's discovery sweep. | No | uncached |
| `https://games.roblox.com/v1/games?universeIds=…` | Full game metadata (name, creator, CCU, visits, genre, favorites, dates). Batched up to 50 IDs per request (see issue #36). | No | 600s (`SLOW`) |
| `https://games.roblox.com/v2/users/{userId}/games` | Games published by a user (first page only in Phase 1). | No | 600s (`SLOW`) |
| `https://groups.roblox.com/v1/groups/{groupId}` | Group metadata, owner, member count. | No | 600s (`SLOW`) |
| `https://users.roblox.com/v1/users/{userId}` | User profile, bio, verification badge, ban state. | No | 600s (`SLOW`) |
| `https://thumbnails.roblox.com/v1/games/icons?universeIds=…` | Game icon URLs. | No | 600s (`SLOW`) |

The presence/CCU projection used by `get_game_player_count` reads from the
same `games.roblox.com/v1/games` endpoint but caches the projection
separately with a `LIVE` (60s) TTL so callers asking only about CCU don't get
stale numbers pinned by a longer-lived metadata cache.

Beyond Roblox itself, v0.2 tools also read the open
[bloxscout-data](https://github.com/IvanKuria/bloxscout-data) dataset —
historical rollups published by our own ingestion pipeline as static JSON on
GitHub's CDN. See [Hosted-Data](./Hosted-Data.md).

## A note on `games.roblox.com/v1/games/list`

The "legacy" list endpoint we used to call for keyword search now returns
`{"errors":[{"code":0,"message":""}]}` for unauthenticated callers (confirmed
2026-05). All search traffic routes through the omni-search API instead;
see the comment in [`src/core/roblox-client.ts`](https://github.com/IvanKuria/bloxscout/blob/main/src/core/roblox-client.ts).

## Roblox Open Cloud (optional)

Open Cloud is only used when a tool explicitly needs access to data
restricted to a game's owner (e.g. private engagement analytics).

### When we use it

- Tools that compute or surface metrics for **the user's own games** beyond
  what the public endpoints expose.

### How to get an API key

1. Sign in at [create.roblox.com](https://create.roblox.com/).
2. Navigate to **Credentials → API Keys**.
3. Create a key scoped to the universes / resources Bloxscout needs (we ask
   for the minimum read-only scopes per feature; see the tool's docs).
4. Copy the key value once — Roblox does not show it again.

### Where to set it

```sh
export ROBLOX_OPEN_CLOUD_API_KEY="..."
```

Bloxscout never reads, logs, or transmits the key anywhere except outbound
to `apis.roblox.com` over HTTPS in the `x-api-key` header.

## Rate-limit posture

Bloxscout is built to be a polite client:

- **Aggressive caching.** Three TTL buckets (`LIVE` 60s, `DEFAULT` 300s,
  `SLOW` 600s) plus in-flight de-duplication so concurrent calls for the
  same key fan in to one upstream request.
- **Exponential backoff with jitter.** On HTTP 5xx, network errors, or
  generic 429s we retry up to 3 times with
  `floor(random() * min(5000, 200 * 2^attempt))` ms delay.
- **Honors `Retry-After`.** When Roblox includes that header on a 429, we
  use the exact delay (numeric seconds or HTTP-date) instead of our
  computed backoff.
- **Stable, identifying User-Agent.**
  `bloxscout/0.0.1 (+https://github.com/IvanKuria/bloxscout)` — so Roblox's
  operations team can identify and reach us if needed.
- **Batches where the API supports it.** Game lookups chunk into requests of
  100 IDs (the documented maximum).

You can override the User-Agent with `BLOXSCOUT_USER_AGENT` or by passing
`{ userAgent }` to the `RobloxClient` constructor.

## What we do not scrape

This list is deliberately verbose — it is the answer to "is this legitimate?"

- **rotrends.com** — Not touched. Bloxscout is a clean-room alternative
  built on Roblox's own endpoints, not a scraper of someone else's analytics
  product.
- **The Roblox web UI** (`roblox.com/games/…` HTML pages) — Not touched.
  We only call documented JSON APIs.
- **Anything behind authentication on `roblox.com`** — Not touched. We do not
  store or transmit `.ROBLOSECURITY` cookies, CSRF tokens, or any other
  session credential. The only authenticated traffic Bloxscout sends is
  Open Cloud, with an API key the user explicitly provides.
- **Private endpoints, internal APIs, or anything obtained by reverse
  engineering the Roblox client.**
- **Anyone's private user data.** All profile, group, and creator fields we
  read are the same fields that load when you visit those pages signed-out
  in a browser.

## Unofficial affiliation disclaimer

Bloxscout is an unofficial tool. It is not affiliated with, endorsed by, or
sponsored by Roblox Corporation or Super League Enterprise / Rotrends.
Roblox, Robux, and related marks are trademarks of Roblox Corporation. Use
of Bloxscout is subject to Roblox's terms; you are responsible for using it
in compliance with them.

If you are part of Roblox's developer relations or security team and have
feedback on our request shape, cache TTLs, or User-Agent, please open an
issue or reach out via the contact in [SECURITY.md](https://github.com/IvanKuria/bloxscout/blob/main/SECURITY.md).
