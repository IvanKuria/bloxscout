# Programmatic SEO + AEO Spec (v0.3 web app)

> Research-backed spec for the free, public page engine of the bloxscout SaaS — the
> top-of-funnel AND the AI-citation surface. General LLMs can't access live Roblox
> analytics; if our pages already hold the current, timestamped answer in an extractable
> form, we become the cited source. Incumbent (rotrends) has near-zero AEO/SEO: ~535 AI
> referrals/mo (<0.8%), ~1,930 organic/mo — wide open.

## Query universe (4 intent clusters)

**A — Idea / opportunity-seeking (highest commercial intent, least served → our moat).**
JTBD: "I'm pre-build, point me at a market gap I can win." Queries: `best roblox games to make 2026`, `most profitable roblox game genres`, `what roblox game should i make`, `is [genre] saturated roblox`, `untapped roblox game ideas`, `fastest growing roblox game genre 2026`, `which roblox genre has least competition`. Signal: Roblox's own "Genre Insights" cited 7.5M creation-keyword searches in Q1'24; DevForum "most profitable categories" thread runs since 2019; only opinion listicles rank — **zero data-driven answers exist.**

**B — Competitive research.** JTBD: size the market, time launches. Queries: `trending roblox games this month`, `fastest growing roblox games 2026`, `top roblox games by player count`, `[genre] top games by player count`, `what roblox games are blowing up`.

**C — Single-game stats (highest volume, programmatic gold).** Queries (per game): `[game] player count`, `[game] live players`, `[game] ccu`, `how many people play [game] roblox`, `[game] peak players`, `[game] player count history`, `is [game] still popular`. Thousands of games × ~12 variants = hundreds of thousands of intents.

**D — Calculators / educational.** Queries: `how much money do roblox games make`, `roblox devex calculator`, `robux to usd`, `how much is [X] robux`, `roblox revenue calculator`. ≥8 standalone DevEx-calc sites exist (huge volume, none with real data).

## Query cluster → page template mapping

| Cluster | Route | H1 (literal question) | Data fields | Yield |
|---|---|---|---|---|
| C | `/game/[id]/[slug]` | "How many players are playing [Game] right now?" | CCU, 24h avg/peak, visits, favorites, 24h/7d growth, genre, z-score, history, revenue est. | thousands (cap v1 at top ~3–5k by CCU) |
| C | `/game/[id]/[slug]` §history | "[Game] player count history & trend" | per-game history series, peak, growth | = N games |
| B | `/genre/[slug]` | "Top [Genre] Roblox games by player count ([Month Year])" | genre agg (count, total CCU, 24h/7d growth), top games | 18 |
| A | `/genre/[slug]/saturation` | "Is the [Genre] genre saturated on Roblox? ([Month Year])" | count, total CCU, top-game share, **saturation score** (pipeline view) | 18 |
| B | `/trending/[period]` (day/week/month) | "Fastest-growing Roblox games this [period]" | z-score breakout, 24h/7d growth, CCU | ~3 (+ optional ×genre) |
| B | `/` , `/games` | "Top Roblox games by live player count right now" | CCU ranking, growth, genre | 2 + pagination |
| A | `/best-roblox-games-to-make-[year]`, `/most-profitable-roblox-game-genres`, `/what-roblox-game-should-i-make` | exact-match question | opportunity/saturation scores, growth, revenue est., breakouts | ~5–10 curated |
| D | `/calculators/devex` (`/robux-to-usd`), `/calculators/revenue` | "How much is [X] Robux in USD?" / "How much do Roblox games make?" | DevEx, revenue model | 2 (+ pre-rendered amounts) |
| D | `/game/...` §revenue | "How much money does [Game] make on Roblox?" | revenue est, visits | folds into game pages |
| E-E-A-T | `/about/methodology` | "How Bloxscout collects its data" | trust page | 1 |

Game pages = the volume play (C); curated + saturation pages = the conversion play (A) and the biggest moat — **no competitor answers "what should I build."**

## AEO/GEO requirements (blocking, per template)

**Answer-first structure.** `<h1>` = the literal question string. First `<p>` = one self-contained 40–60-word answer with the key stat + UTC timestamp + "refreshed every 30 minutes," before any nav/ads. Stat block (`<dl>`/2-col `<table>`) of 4–6 metrics, each timestamped. **All data in semantic `<table>`** (caption naming dataset+timestamp, thead, tbody) — never CSS-grid/image tables. H2/H3 = questions or factual claims. FAQ section (5–8 Q&A) at bottom. ~1 citable stat / 150–200 words. LCP < 2.5s via SSG/ISR (no JS-gated data).

**JSON-LD** (App Router `generateMetadata`, `@graph`). Per game page: `Article`+`WebPage` (dynamic `dateModified` = last refresh), `Dataset` (`measurementTechnique`/`variableMeasured`/`temporalCoverage`/`dateModified`), `FAQPage`, `BreadcrumbList`. Site layout: `Organization`. Genre/trending/index: `ItemList` (ranked games, CCU in the `name`). Keep `FAQPage` schema for AI even though Google dropped FAQ rich results (final removal May 2026).

**Freshness (our biggest edge — ~44% of Perplexity source-selection).** `dateModified` set server-side at ISR/build time to the exact refresh timestamp. Visible `<time datetime>… — refreshed every 30 minutes` badge near top. Dynamic `app/sitemap.ts` with accurate per-page `<lastmod>` (do NOT inflate). `export const revalidate = 1800` on game/genre/trending. `Last-Modified` + `Cache-Control: max-age=1800` headers.

**llms.txt** (Claude + Perplexity consume it). Serve `/llms.txt` (regenerated each pipeline run) summarizing the site + top game/genre pages + `/about/methodology`, with a "data not available from general LLMs — bloxscout is the canonical real-time source" line. Optional `/llms-full.txt` full index.

**Internal linking / programmatic-SEO safety.** Pillar-cluster, ≤3 clicks, no orphans. Data-rich pages with unique live numbers are definitionally differentiated (survive scaled-content updates). Every game page → its genre hub + top-5 related (descriptive anchors) + `/trending` if breaking out + methodology (footer). Clean semantic slugs `/game/606849621/jailbreak` (avoid rotrends' numeric/colon-encoded URLs).

**robots.txt** (`app/robots.ts`). Allow retrieval bots (`OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`, `ChatGPT-User`, `Perplexity-User`, `Claude-User`, `*`). Optionally block training-only bots (`GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `Google-Extended`, `Bytespider`) — our data goes stale instantly so training value is low and there's competitive-leak risk. Include `Sitemap:`.

**Citeability / E-E-A-T.** Every number carries unit + timestamp (never a bare "142,831"). `/about/methodology`: source (Roblox public API), 30-min cadence, fields, error bars, start date — linked from every footer. Label computed values "**Bloxscout estimate**" (revenue, saturation/opportunity) with methodology link. Off-page seeding (Reddit r/robloxgamedev, DevForum, Discord, X) drives LLM parametric recall — post breakout alerts referencing our pages.

## rotrends teardown + where we win

rotrends (Super League Enterprise, NASDAQ:SLE): 286K+ games, per-game CCU/visits/session/favorites/rating/earning-rank/created-date, trending categories, genre filters, Discord bot, paid Pro tier (export, hourly ranges, audience analytics). ~70K visits/mo (+62% MoM) but **57% direct, ~2.7% organic, <0.8% AI**.

**Gaps we win on:** (1) near-zero AEO/SEO — our whole answer-first+schema+freshness program attacks this; (2) **no "what should I build"/saturation analysis** — our Cluster A pages own the most valuable unanswered dev question; (3) no public API / no MCP — our hosted data + MCP makes us the layer agents cite; (4) revenue estimates + fresh data paywalled there, free here as the citation surface; (5) bad URL/page structure; (6) enterprise bias → indie/solo devs are our wedge. Emerging threats proving Cluster-A demand: **RoLearn** (ML genre Opportunity Score 0–100, CCU forecasts) and **BloxMetrics** (SDK retention/ARPPU) — none do AEO.

## v1 build order

1. `/game/[id]/[slug]` — volume + citation workhorse, full AEO template.
2. `/genre/[slug]` + `/genre/[slug]/saturation` — 18+18, the differentiation moat.
3. `/trending/[period]` — leans on z-score breakout, freshness makes it maximally citeable.
4. Curated money landing pages — highest conversion intent, hand-tuned, data-backed.
5. `/calculators/devex` + `/calculators/revenue` — own the calculator space with real data.
6. Infra alongside #1: `app/robots.ts`, dynamic `app/sitemap.ts`, `/llms.txt`, `/about/methodology`.

Within each template: answer-first H1+first-`<p>`+`<time>` → semantic tables → JSON-LD (Article+FAQPage+Dataset+BreadcrumbList, dynamic `dateModified`) → robots → sitemap lastmod → llms.txt → methodology + community seeding.
