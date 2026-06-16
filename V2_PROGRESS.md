# V2 — Cross-Platform "Replicate-This" Radar — Progress

**Branch:** `feat/v2-replication-radar` · **Plan:** `~/.claude/plans/im-thinking-of-going-synthetic-haven.md`
**Mode:** autonomous overnight `/loop` (self-paced). Never touch main/prod. Commit per green slice.

## Status checklist

### Phase 1 — Steam ingestion + published view (backend)
- [x] `packages/core/src/steam-virality.ts` + tests (pure scoring) — **green (15 tests)**
- [x] `packages/core/src/hosted-format.ts` — `SteamBreakouts*` + `SteamState*` + `SteamCatalog*` schemas, `HOSTED_PATHS` (+3 paths) — **core builds clean**
- [x] `packages/core/src/steam-client.ts` (undici, MockAgent-injectable) + tests — **9 tests green**; `SteamApiError` added to `errors.ts`
- [x] `packages/core/src/external-sources.ts` (`ExternalSource` iface + `SteamSource`) — **3 tests green**
- [x] `pipeline/steam-breakouts.ts` (`computeSteamBreakouts` → view/state/catalog) + tests — **8 tests green**; full typecheck (both tsconfigs) clean
- [x] `pipeline/run.ts` flag-gated `--steam-radar` stage (+`--steam-enrich-limit`); `pipeline/validate.ts` `validateSteamBreakouts` — **typecheck clean**
- [x] `packages/core/src/hosted-data.ts` `getSteamBreakoutsView` + `getSteamCatalog` + `index.ts` barrel — **full suite 344 tests green**

**✅ Phase 1 backend COMPLETE** (scoring → schemas → client → adapter → stage → pipeline wiring → validation → read-side). Live `--steam-radar` smoke run against real Steam + a bloxscout-data checkout is deferred to the morning report (network/data-repo + one-live-call policy).

### Phase 2 — Agent tools + widgets
- [x] `apps/web/lib/cross-platform.ts` (tag→niche heuristic + `matchExternalGame` resolver) — **8 tests green** (via root vitest, relative import)
- [x] `apps/web/lib/data.ts` getters (`getSteamBreakouts`, `getSteamCatalog`) — web tsc clean
- [x] tools `get_replication_radar`, `analyze_replication_target` (`lib/agent/tools.ts`) + `protocol.ts` citations
- [x] widgets `replication-radar.tsx`, `replication-brief.tsx` + `widgets.tsx` registration — **next build green (exit 0)**
- [x] system prompt paragraph (`lib/agent/anthropic.ts`) — radar/brief tool-selection + trend-chasing framing + hint/owners/observationBasis caveats
- [x] PostHog events — server-side already covered by the route's generic `copilot_tool_invoked {toolName}`; added client `replication_target_opened` CTA on both widgets

**✅ Phase 2 (web agent surface) COMPLETE** — tools + widgets + system prompt + analytics; `next build` exit 0.

### Phase 3 — Hub SEO page
- [x] `apps/web/app/steam-games-to-clone-on-roblox/page.tsx` — ISR (1800s), answer-first + FAQs + ranked table (game→Steam, niche→/genre), `<ComputingState>` fallback. **next build prerenders it (exit 0)**. (Cross-links from rising/best pages + hub→/roblox-version-of land in Phase 4.)

### Phase 4 — Programmatic AEO pages
- [x] `apps/web/app/roblox-version-of/[slug]/page.tsx` — `generateStaticParams` from catalog (top 50 prebuilt, rest dynamic+ISR), answer-first "Is there a Roblox version of X?", **live Roblox matches via `analyzeNiche`** (unique per page), FAQ + Breadcrumb JSON-LD, build/copilot CTAs. `getSteamCatalogEntryBySlug` added to data.ts.
- [x] `app/sitemap.ts` extension — hub + `robloxVersionPages` from catalog; **hub rows now link to `/roblox-version-of/<slug>`** (cluster internal-linking)
- [x] reverse cross-link from rising-roblox-niches → hub (best-page link skipped as optional; detail pages + sitemap already interlink the cluster)

**✅ Phase 4 core COMPLETE** — `next build` exit 0 (0 pages prebuilt until catalog publishes; renders on-demand after).

### Wrap
- [x] full green gate — root **352 tests** pass (44 files), typecheck clean (both tsconfigs), web eslint clean, **`next build` exit 0**
- [x] draft PR opened

## ✅ BUILD COMPLETE — all 4 phases shipped on `feat/v2-replication-radar`
Phase 1 (Steam ingest→scoring→view/state/catalog) · Phase 2 (copilot tools+widgets+prompt+analytics) · Phase 3 (hub SEO page) · Phase 4 (programmatic AEO pages+sitemap). 12 green-gated commits. New tests: steam-virality (15), steam-client (9), external-sources (3), steam-breakouts (8), cross-platform (8) = 43 added; 352 total.

## Iteration log
- **Iter 1:** branch created; read existing patterns (`concentration.ts`, `growth.ts`, test style). Implemented pure virality scoring `steam-virality.ts` (review-velocity 0.45 / player-velocity 0.25 / recency 0.20 / reception 0.10; reuses `logistic`). 15 unit tests pass incl. a MECCHA-CHAMELEON-like case scoring >80. Committed `5fdfd43`.
- **Iter 11 (Phase 4):** programmatic `/roblox-version-of/[slug]` AEO pages — catalog-driven `generateStaticParams` (top 50 prebuilt + dynamicParams/ISR), answer-first H1, unique per-page live Roblox matches via `analyzeNiche`, FAQ + Breadcrumb JSON-LD, "build it" guidance + copilot CTA. Extended `sitemap.ts` (hub + catalog pages) and made hub rows link into the cluster. `getSteamCatalogEntryBySlug` added. eslint clean; `next build` exit 0 (0 prebuilt until catalog publishes — correct). Committed.
- **Iter 10 (Phase 3):** built `/steam-games-to-clone-on-roblox` hub page from the rising-niches ISR template — trend-chasing answer/intro, 3 AEO FAQs, ranked virality table (game→Steam store, niche→/genre or /rising), first-seen honesty note, `<ComputingState>` fallback. eslint clean; `next build` prerenders the route (exit 0). Phase 3 done. Committed.
- **Iter 9:** added the radar/brief tool-selection paragraph to `SYSTEM_PROMPT` (trend-chasing framing + caveats; YOU narrate the brief over briefSections). Found server-side PostHog already covered by the route's generic `copilot_tool_invoked`; added client `replication_target_opened` capture on both widgets' Steam-store links. eslint clean, `next build` exit 0. Phase 2 done. Committed.
- **Iter 8:** built `replication-radar.tsx` (ranked clone-candidate list: header image, virality bar, review velocity, niche chip→/genre) + `replication-brief.tsx` (single-game facts grid + tags + adaptation-brief section scaffold the agent narrates). Registered both in `widgets.tsx` (WIDGET_BY_TOOL + RUNNING_LABEL) and `protocol.ts` (CITATION_SOURCE "Steam store + reviews"). Swapped biome-ignore→eslint-disable for the external `<img>`. **`next build` exit 0**, web tsc + eslint clean. Committed.
- **Iter 7:** added the two agent tools to `tools.ts` (see 2.2a).
- **Iter 6 (Phase 2 start):** web read-side getters (`getSteamBreakouts`/`getSteamCatalog` in `lib/data.ts`) + pure `lib/cross-platform.ts` (tag/genre→Roblox-niche hint with `/genre` slug links, ordered rules; `matchExternalGame` resolver by appId/name). 8 tests green (run from root vitest via relative import since apps/web has no test runner). Root typecheck + web tsc + eslint all clean. Committed.
- **Iter 4:** `external-sources.ts` (`ExternalSource` iface + `SteamSource` adapter, best-effort sub-signals, skips non-`game` types) + `pipeline/steam-breakouts.ts` (`computeSteamBreakouts`: candidates→enrich→velocity vs prior state→virality→ranked view + next state + accumulating catalog with slugs/prune). 11 new tests (8 stage incl. first-seen vs two-snapshot, ranking, catalog merge, prune; 3 adapter via MockAgent). Full repo typecheck clean. 35 Steam tests green total. Committed.
- **Iter 3:** added `SteamApiError` (errors.ts) + `steam-client.ts` mirroring `roblox-client` transport (injectable dispatcher/cache/sleep, backoff, Retry-After). Methods: `getFeaturedApps`, `getAppDetails`, `getReviewSummary`, `getSteamSpy`, `getCurrentPlayers` + `parseOwnersBand`. 9 MockAgent tests green (incl. MECCHA fixtures, 5xx-retry). Core builds clean. Committed.
- **Iter 2:** added `SteamBreakouts*` / `SteamAppState`+`SteamStateFile` / `SteamCatalog*` Zod schemas + 3 `HOSTED_PATHS` entries to `hosted-format.ts`. Caught + fixed nodenext ESM import (`./concentration.js`) via `build:core` gate. Core builds clean; hosted-format + virality tests green (23). Committed.

## MORNING REPORT — needs Ivan
_(empty so far)_
- **Live Steam shape check (do once):** run `tsx pipeline/run.ts --data-dir ../bloxscout-data --skip-discovery --steam-radar --steam-enrich-limit 10` once to confirm real Steam `featuredcategories`/`appdetails`/`appreviews` JSON still matches the client's parsing, and that `v1/views/steam-breakouts.json` + `v1/external/steam/{state,catalog}.json` write. (Loop kept to fixtures to respect Steam rate limits / one-live-call policy.)
- Reminder (known up front): publishing the real `steam-breakouts.json`/`catalog.json` to the live CDN needs a pipeline run against the `bloxscout-data` repo + the GitHub Action; live-data QA and any Vercel/PostHog dashboard toggles are human steps. All code/tests/build will be done on the branch.
