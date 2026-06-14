# Pipeline Views Spec (v0.3): saturation, rising-niches, genre-revenue

Three new computed views for `pipeline/views.ts` (`computeViews`), written from `pipeline/run.ts`
alongside the existing four, following the `v1/views/*.json` + `schemaVersion`/`generatedAt`/`entries|genres`
conventions in `packages/core/src/hosted-format.ts`.

## Shared context (verified against code)
- `computeViews({ registry, hourlyFiles, run, now })` builds per game a `GameSeries` and a flat `ViewEntry[]`
  (`playing`, `avg24h`, `peak24h`, `growth24hPct`, `growth7dPct`, `zScore24h`, `visitsDelta24h`, `genre`).
  All three new views derive from those `entries` plus the per-genre `GenreAcc` already assembled in `genresView` — **no new reads** for #1/#3; #2 depends on #1 + genre growth.
- `registry.games[id].addedAt` is the only signal for "recency of successful entrants" (meaningful only after accrual — see flags).
- Reuse: `growthRate`, `windowGrowthPct`, `zScoreOfLatest` (growth.ts); `estimateGameRevenue`, `DEFAULT_DEVEX_RATE_USD_PER_ROBUX`, `REVENUE_ESTIMATE_DISCLAIMER` (calculators.ts); private `capGrowth`, `GameSeries`, genre `summed` series (views.ts).
- **New core file `packages/core/src/concentration.ts`** (pure, unit-tested):
  - `herfindahlIndex(values): number` — HHI over shares, 0..1 (Σ(vᵢ/Σv)²).
  - `topNShare(values, n): number` — share of total held by top-N, 0..1.
  - `logistic(x, midpoint, steepness): number` — squash to 0..1.
- **New optional `packages/core/src/genre-monetization.ts`**: `GENRE_MONETIZATION` override table for per-genre conversion/ARPPU (defaults to calculator defaults).

Refactor `genresView` so the `byGenre` accumulator is built ONCE and shared with the three new functions.

## View 1 — Saturation / gap index per genre
**File:** `v1/views/saturation.json` (`saturationView` in `HOSTED_PATHS`). Fn `saturationView(generatedAt, byGenre, registry, now)`.

For each genre with `gameCount >= MIN_GAMES_FOR_SATURATION` (5); else emit `score:null, reason:"insufficient_games"`.
Let `p_i = max(playing,0)`, `P = Σp_i`.
- **A. HHI:** `hhi = herfindahlIndex(playings)` — high = one game owns players.
- **B. Top share:** `top1Share`, `top3Share = topNShare(p, n)`.
- **C. Incumbency** (needs `addedAt`): among top `INCUMBENCY_TOP_N=10` by playing, `freshTopShare = count(added within ENTRANT_WINDOW_DAYS=30)/min(10,gameCount)`; `incumbencyScore = 1 - freshTopShare` (1=locked up). If `addedAt` unreliable → `null`, drop term, renormalize.
- **D. Demand headroom (anti-saturation):** `intensity = P/gameCount`; `intensityScore = logistic(intensity/medianIntensityAcrossGenres, 1, 2)` (compute cross-genre median first).

```
saturationRaw = W_HHI*hhi + W_TOP1*top1Share + W_INCUMBENCY*incumbencyScore - W_HEADROOM*intensityScore
saturationScore = round(100 * clamp01(saturationRaw))   // higher = more saturated
```
Weights (tunable module constants): `W_HHI=0.40, W_TOP1=0.25, W_INCUMBENCY=0.35, W_HEADROOM=0.30`.
`whiteSpace = saturationScore < WHITE_SPACE_THRESHOLD(40) && gameCount >= MIN_GAMES_FOR_SATURATION`.

Output `SaturationEntrySchema`: `{genre, gameCount, totalPlaying, saturationScore:number|null, whiteSpace:bool, components:{hhi, top1Share, top3Share, incumbencyScore:number|null, intensityScore, playersPerGame}, reason:string|null}`; view sorted by score desc, nulls last.

## View 2 — Rising niches
**File:** `v1/views/rising-niches.json`. Fn `risingNichesView(generatedAt, genreAggregates, saturationEntries, now)` — computed AFTER views 1 & 3.

```
momentum    = clamp01(logistic(growth7dPct ?? growth24hPct ?? 0, 0.15, 8))
opportunity = 1 - saturationScore/100
durability  = durabilityScore(genre)
risingScore = round(100 * momentum * opportunity * durability)   // MULTIPLICATIVE — a zero in any kills it
```
**`durabilityScore`** (start 1.0, multiply penalties, clamp [0,1]) from the genre `summed` series:
1. Both-window agreement: need `growth7dPct>0 AND growth24hPct>0`; up-24h-but-down-7d → `*0.3`.
2. Not a single spike: genre-level `zScoreOfLatest` on trailing-24h buckets; if `> SPIKE_Z(3.5)` → event-driven flash → `*0.5`.
3. Breadth: if `top1Share > 0.6` the "niche" is one game → `*0.5`.

Output `RisingNicheEntrySchema`: `{genre, risingScore, growth24hPct, growth7dPct, saturationScore, components:{momentum, opportunity, durability, genreZScore, top1Share}, durabilityBasis:"7d"|"24h-only", topGames[]}`; sorted by risingScore desc; keep all ~18 genres ranked.

## View 3 — Per-genre revenue-estimate aggregate (clearly labeled estimate)
**File:** `v1/views/genre-revenue.json`. Fn `genreRevenueView(generatedAt, byGenre, now)`.

Per member: `est = estimateGameRevenue({playing: member.playing, visits:0}, {daysActive:30})`. Aggregate 3 lenses:
1. `estTotalMonthlyUsd` = Σ — total addressable (incumbents dominate; correct for "biggest money").
2. `estMedianGameMonthlyUsd` = median — the *typical* game; best for "profitable for a new entrant."
3. `estTopNMonthlyUsd` = Σ top `REVENUE_TOP_N=5` by playing — headline earners.
4. `revenuePerThousandCcuUsd` = total/(totalPlaying/1000) — efficiency (constant under uniform assumptions; meaningful once `GENRE_MONETIZATION` overrides diverge).

Surface assumptions at view top-level: `conversionRate`, `averageRobuxPerPayingUser`, `daysActive=30`, `rateUsdPerRobux = DEFAULT_DEVEX_RATE_USD_PER_ROBUX`, `confidence:"low"`, `disclaimer = REVENUE_ESTIMATE_DISCLAIMER`. Per-genre `assumptionsOverridden:bool`.

Output `GenreRevenueViewSchema`: `{schemaVersion, generatedAt, confidence:"low", assumptions{...}, disclaimer, entries:[{genre, gameCount, totalPlaying, estTotalMonthlyUsd, estMedianGameMonthlyUsd, estTopNMonthlyUsd, revenuePerThousandCcuUsd, assumptionsOverridden}]}` sorted by estTotalMonthlyUsd desc.

## Wiring (existing files)
1. `packages/core/src/hosted-format.ts`: add the 3 schema/type pairs; add 3 keys to `HOSTED_PATHS` (additive within v1).
2. `pipeline/views.ts`: add `saturation`/`risingNiches`/`genreRevenue` to `ComputedViews` + return; share `byGenre`; new tuning constants by the `*_LIMIT` block; compute View 2 after 1 & 3.
3. `pipeline/run.ts` (~line 243): 3 more `writeJsonFile(join(dataDir, HOSTED_PATHS.<x>), views.<x>)`; extend summary log.
4. `pipeline/validate.ts`: add the 3 views to `validateRunOutputs` (empty/garbage fails the run).
5. New core: `concentration.ts` (+ unit tests), `genre-monetization.ts`.

## ≥7-day-history reliability flags (dataset began filling continuously 2026-06-13)
- **View 2 (rising niches):** genre `growth7dPct` is null/unreliable until **~2026-06-20**. Ship with `durabilityBasis:"24h-only"` fallback + low confidence until then.
- **View 1 incumbency (Signal C):** needs `addedAt` window populated → `incumbencyScore:null` (term dropped, weights renormalized) until **~2026-07-13**. HHI/share/intensity reliable immediately.
- **View 3 (genre revenue):** no history dependency — **reliable day one; ship first.**
