# V2 — Cross-Platform "Replicate-This" Radar — Progress

**Branch:** `feat/v2-replication-radar` · **Plan:** `~/.claude/plans/im-thinking-of-going-synthetic-haven.md`
**Mode:** autonomous overnight `/loop` (self-paced). Never touch main/prod. Commit per green slice.

## Status checklist

### Phase 1 — Steam ingestion + published view (backend)
- [x] `packages/core/src/steam-virality.ts` + tests (pure scoring) — **green (15 tests)**
- [ ] `packages/core/src/hosted-format.ts` — `SteamBreakouts*` + `SteamState*` + `SteamCatalog*` schemas, `HOSTED_PATHS`
- [ ] `packages/core/src/steam-client.ts` (undici, MockAgent-injectable) + tests
- [ ] `packages/core/src/external-sources.ts` (`ExternalSource` iface + `SteamSource`)
- [ ] `pipeline/steam-breakouts.ts` (`computeSteamBreakouts`) + tests
- [ ] `pipeline/run.ts` flag-gated `--steam-radar` stage; `pipeline/validate.ts`
- [ ] `packages/core/src/hosted-data.ts` `getSteamBreakoutsView` / catalog + `index.ts`

### Phase 2 — Agent tools + widgets
- [ ] `apps/web/lib/cross-platform.ts` (tag→niche heuristic, resolver)
- [ ] `apps/web/lib/data.ts` getters
- [ ] tools `get_replication_radar`, `analyze_replication_target` (`lib/agent/tools.ts`) + `protocol.ts`
- [ ] widgets `replication-radar.tsx`, `replication-brief.tsx` + `widgets.tsx`
- [ ] system prompt paragraph (`lib/agent/anthropic.ts`)
- [ ] PostHog events (server tool dispatch + client CTA)

### Phase 3 — Hub SEO page
- [ ] `apps/web/app/steam-games-to-clone-on-roblox/page.tsx` + cross-links

### Phase 4 — Programmatic AEO pages
- [ ] `apps/web/app/roblox-version-of/[slug]/page.tsx` (generateStaticParams from catalog)
- [ ] `app/sitemap.ts` extension (hub + roblox-version pages)

### Wrap
- [ ] full green gate (build/typecheck/lint/test + next build), draft PR

## Iteration log
- **Iter 1:** branch created; read existing patterns (`concentration.ts`, `growth.ts`, test style). Implemented pure virality scoring `steam-virality.ts` (review-velocity 0.45 / player-velocity 0.25 / recency 0.20 / reception 0.10; reuses `logistic`). 15 unit tests pass incl. a MECCHA-CHAMELEON-like case scoring >80. Committed.

## MORNING REPORT — needs Ivan
_(empty so far)_
- Reminder (known up front): publishing the real `steam-breakouts.json`/`catalog.json` to the live CDN needs a pipeline run against the `bloxscout-data` repo + the GitHub Action; live-data QA and any Vercel/PostHog dashboard toggles are human steps. All code/tests/build will be done on the branch.
