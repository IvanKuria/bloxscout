/**
 * Per-game revenue landing page — `/game/[universeId]/[slug]/revenue`.
 *
 * Captures the high-volume exact-match query "how much money does <game> make"
 * as its own URL/H1/canonical (the main game page is canonical for the live
 * player-count query). Goes deeper than the game page's revenue summary: a
 * daily/monthly/yearly Robux↔USD breakdown, a genre-median comparison, the full
 * assumption list, and money-specific FAQs. Reuses the same
 * `estimateGameRevenue` core function so the headline figure stays consistent
 * across both pages.
 *
 * Like the game page, the revenue estimate degrades honestly: a young dataset
 * means genre comparison or some fields may be missing — never crash, never
 * fake a number.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  estimateGameRevenue,
  type EstimateGameRevenueResult,
} from "@bloxscout/core/calculators";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge } from "@/components/data/console";
import { AskBloxscout } from "@/components/cta/ask-bloxscout";
import { buildLandingGraph, type LandingFaq } from "@/app/_money/landing";
import {
  getFreshness,
  getGameSnapshot,
  getGenreRevenue,
  getTrending,
  type GameSnapshot,
} from "@/lib/data";
import {
  displayName,
  genreSlug as toGenreSlug,
  int,
  slugify,
  usd,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";

// ISR: re-render at most every 30 minutes, matching the pipeline cadence.
export const revalidate = 1800;
// Allow games beyond the prerendered cap to render on first visit (then cache).
export const dynamicParams = true;

/** Prerender the top games by CCU; the long tail renders on-demand via ISR. */
const STATIC_PARAMS_CAP = 250;

export async function generateStaticParams(): Promise<
  Array<{ universeId: string; slug: string }>
> {
  const trending = await getTrending();
  if (!trending) return [];
  return [...trending.entries]
    .sort((a, b) => b.playing - a.playing)
    .slice(0, STATIC_PARAMS_CAP)
    .map((e) => ({ universeId: String(e.universeId), slug: slugify(e.name) }));
}

interface PageProps {
  params: Promise<{ universeId: string; slug: string }>;
}

/** Revenue estimates over three horizons, all from the same CCU input. */
interface RevenueBreakdown {
  daily: EstimateGameRevenueResult;
  monthly: EstimateGameRevenueResult;
  yearly: EstimateGameRevenueResult;
}

function estimateBreakdown(snapshot: GameSnapshot): RevenueBreakdown {
  const input = { playing: snapshot.playing, visits: snapshot.visits ?? 0 };
  return {
    daily: estimateGameRevenue(input, { daysActive: 1 }),
    monthly: estimateGameRevenue(input, { daysActive: 30 }),
    yearly: estimateGameRevenue(input, { daysActive: 365 }),
  };
}

/** Self-contained 40-60 word answer paragraph (money-first). */
function buildAnswer(
  name: string,
  rev: RevenueBreakdown,
  playing: number,
  stamp: string,
): string {
  return `${name} earns an estimated ${usd(rev.monthly.estimatedMonthlyUsd)} per month on Roblox, based on its ${int(playing)} concurrent players as of ${stamp} — roughly ${usd(rev.daily.estimatedMonthlyUsd)} per day or ${usd(rev.yearly.estimatedMonthlyUsd)} per year at current activity. This is a low-confidence bloxscout estimate from platform-average monetization; real revenue varies 5-10x.`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { universeId } = await params;
  const id = Number(universeId);
  const snapshot = Number.isFinite(id) ? await getGameSnapshot(id) : null;
  if (!snapshot) {
    return { title: "Game not found", robots: { index: false, follow: true } };
  }
  const name = displayName(snapshot.name);
  const slug = slugify(snapshot.name);
  const canonical = `${site.url}/game/${snapshot.universeId}/${slug}/revenue`;
  const { date } = await getFreshness();
  const rev = estimateBreakdown(snapshot);
  const title = `How much money does ${name} make? — Roblox revenue estimate`;
  const description = `${name} earns an estimated ${usd(rev.monthly.estimatedMonthlyUsd)} per month on Roblox (~${int(snapshot.playing)} concurrent players, as of ${utcStamp(date)}). Monthly, daily and yearly revenue estimates with the assumptions behind them. A bloxscout estimate.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GameRevenuePage({ params }: PageProps) {
  const { universeId, slug } = await params;
  const id = Number(universeId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const snapshot = await getGameSnapshot(id);
  if (!snapshot) notFound();

  const name = displayName(snapshot.name);
  const canonicalSlug = slugify(snapshot.name);
  if (slug !== canonicalSlug) {
    redirect(`/game/${snapshot.universeId}/${canonicalSlug}/revenue`);
  }

  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const path = `/game/${snapshot.universeId}/${canonicalSlug}/revenue`;
  const gamePath = `/game/${snapshot.universeId}/${canonicalSlug}`;
  const genreSlug = snapshot.genre ? toGenreSlug(snapshot.genre) : null;

  const rev = estimateBreakdown(snapshot);
  const monthlyUsd = rev.monthly.estimatedMonthlyUsd;
  const answer = buildAnswer(name, rev, snapshot.playing, stamp);

  // Genre-median comparison (graceful: the view may not be published yet).
  const genreRevenue = await getGenreRevenue();
  const genreEntry =
    snapshot.genre && genreRevenue
      ? (genreRevenue.entries.find((e) => e.genre === snapshot.genre) ?? null)
      : null;
  const median = genreEntry?.estMedianGameMonthlyUsd ?? null;
  const vsMedian =
    median && median > 0 ? monthlyUsd / median : null;

  const h1 = `How much money does ${name} make on Roblox?`;

  const rows: Array<{ label: string; robux: number; usd: number }> = [
    { label: "Per day", robux: rev.daily.estimatedMonthlyRobux, usd: rev.daily.estimatedMonthlyUsd },
    { label: "Per month", robux: rev.monthly.estimatedMonthlyRobux, usd: rev.monthly.estimatedMonthlyUsd },
    { label: "Per year", robux: rev.yearly.estimatedMonthlyRobux, usd: rev.yearly.estimatedMonthlyUsd },
  ];

  const faqs: LandingFaq[] = [
    {
      question: `How much money does ${name} make on Roblox?`,
      answer: `bloxscout estimates ${name} grosses about ${usd(monthlyUsd)} per month (~${usd(rev.daily.estimatedMonthlyUsd)} per day) as of ${stamp}, based on its ${int(snapshot.playing)} concurrent players and platform-average monetization. It's a low-confidence estimate — Roblox doesn't publish per-game revenue.`,
    },
    {
      question: `How does bloxscout estimate ${name}'s revenue?`,
      answer: `It assumes about ${(rev.monthly.inputs.conversionRate * 100).toFixed(1)}% of concurrent players pay on a given day, each spending ~${rev.monthly.inputs.averageRobuxPerPayingUser} Robux, then converts the Robux to USD at the DevEx rate of ${rev.monthly.inputs.rateUsdPerRobux} USD per Robux. Multiply by 30 for the monthly figure.`,
    },
    {
      question: `How accurate is this ${name} revenue estimate?`,
      answer:
        "Treat it as order-of-magnitude direction, not accounting. Real revenue varies by 5-10x depending on gamepass pricing, conversion, and monetization design. bloxscout marks every revenue figure as a low-confidence estimate.",
    },
    {
      question: `Does ${name} earn Robux or US dollars?`,
      answer: `In-game purchases pay out in Robux. Developers convert Robux to USD through Roblox's Developer Exchange (DevEx) at ${rev.monthly.inputs.rateUsdPerRobux} USD per Robux, with a 30,000 Robux minimum to cash out. The USD figures here are DevEx-rate conversions of the estimated Robux.`,
    },
  ];

  const graph = buildLandingGraph({ path, h1, answer, iso, faqs });

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
        {/* ---- Answer-first hero ---- */}
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-5xl px-6 pt-10 pb-12 sm:pt-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-6 font-mono text-xs text-console-muted"
            >
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-console-foreground">
                    bloxscout
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/games" className="hover:text-console-foreground">
                    games
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={gamePath} className="hover:text-console-foreground">
                    {name}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">revenue</li>
              </ol>
            </nav>

            <FreshnessBadge iso={iso} date={date} className="mb-5" />

            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-[1.1] tracking-tight text-console-foreground sm:text-4xl lg:text-[44px]">
              {h1}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                  Est. monthly revenue
                </p>
                <p className="tabular mt-1 font-heading text-4xl font-semibold text-console-foreground sm:text-5xl">
                  {usd(monthlyUsd)}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md sm:justify-self-end">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Concurrent players
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {int(snapshot.playing)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Est. monthly Robux
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {int(rev.monthly.estimatedMonthlyRobux)} R$
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Genre
                  </dt>
                  <dd className="font-mono text-sm text-console-foreground">
                    {snapshot.genre ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Confidence
                  </dt>
                  <dd className="font-mono text-sm capitalize text-console-foreground">
                    {rev.monthly.confidence}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          {/* ---- Breakdown table ---- */}
          <section aria-labelledby="breakdown-heading" className="mb-16">
            <h2
              id="breakdown-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              {name} revenue estimate: daily, monthly &amp; yearly
            </h2>
            <p className="mb-1 text-sm text-muted-foreground">
              Estimated gross at {int(snapshot.playing)} concurrent players, in
              Robux and DevEx-converted USD, as of {stamp}.
            </p>
            <p className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Bloxscout estimate
            </p>

            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Estimated gross revenue for {name} over daily, monthly and
                  yearly horizons, in Robux and USD, measured by bloxscout at{" "}
                  {stamp}.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Horizon
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Est. Robux
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Est. USD
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.label} className="bg-card">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal text-foreground">
                        {r.label}
                      </th>
                      <td className="tabular px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {int(r.robux)} R$
                      </td>
                      <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">
                        {usd(r.usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {vsMedian !== null && genreEntry ? (
              <p className="mt-3 text-sm text-muted-foreground">
                That&rsquo;s roughly{" "}
                <strong className="text-foreground">
                  {vsMedian >= 1 ? `${vsMedian.toFixed(1)}×` : `${(vsMedian * 100).toFixed(0)}% of`}
                </strong>{" "}
                the median {snapshot.genre} game on Roblox, which bloxscout
                estimates at {usd(median)} per month.{" "}
                <Link
                  href="/most-profitable-roblox-game-genres"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Compare genres &rarr;
                </Link>
              </p>
            ) : null}

            <p className="mt-3 text-xs text-muted-foreground">
              {rev.monthly.disclaimer} See{" "}
              <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">
                the methodology
              </Link>{" "}
              for error bars, or run your own numbers in the{" "}
              <Link href="/calculators/revenue" className="underline underline-offset-4 hover:text-foreground">
                revenue calculator
              </Link>
              .
            </p>
          </section>

          {/* ---- How the estimate is built ---- */}
          <section aria-labelledby="how-heading" className="mb-16">
            <h2
              id="how-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              How this estimate is calculated
            </h2>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              bloxscout models gross Robux from live concurrent players, then
              converts to USD at the Roblox DevEx rate. The inputs are
              platform-average assumptions, not {name}-specific measurements:
            </p>
            <ul className="space-y-2.5">
              {rev.monthly.assumptions.map((a) => (
                <li
                  key={a}
                  className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Conversion slot ---- */}
          <AskBloxscout
            heading={`Ask bloxscout about ${name}`}
            blurb={`Go past the estimate — ask follow-up questions about ${name}'s revenue, players, and growth, answered from bloxscout's live Roblox data.`}
            prompts={[
              `Is ${name}'s revenue growing or shrinking?`,
              `What would ${name} earn at double its current players?`,
              snapshot.genre
                ? `How does ${name}'s revenue compare to other ${snapshot.genre} games?`
                : `How does ${name} compare to similar games?`,
            ]}
          />

          {/* ---- Internal links ---- */}
          <div className="mb-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href={gamePath}
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              {name} live player count &rarr;
            </Link>
            {genreSlug ? (
              <Link
                href={`/genre/${genreSlug}`}
                className="font-medium underline underline-offset-4 hover:text-accent"
              >
                Top {snapshot.genre} games &rarr;
              </Link>
            ) : null}
            <Link
              href="/most-profitable-roblox-game-genres"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Most profitable genres &rarr;
            </Link>
            <Link
              href="/calculators/revenue"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Revenue calculator &rarr;
            </Link>
          </div>

          {/* ---- FAQ ---- */}
          <section aria-labelledby="faq-heading" className="mb-4">
            <h2
              id="faq-heading"
              className="mb-5 font-heading text-2xl font-semibold tracking-tight"
            >
              Frequently asked questions
            </h2>
            <dl className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
              {faqs.map((f) => (
                <div key={f.question} className="px-5 py-4">
                  <dt className="font-heading text-base font-medium text-foreground">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
