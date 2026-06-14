/**
 * Head-to-head comparison page — `/compare/<slugA>-vs-<slugB>`.
 *
 * Captures the high-volume, near-zero-competition "<game> vs <game>" query.
 * Resolves both games from the live trending view, lays their live stats and
 * revenue estimates side by side, and names a winner per metric. Canonicalizes
 * to a stable ID-ordered matchup slug so a-vs-b and b-vs-a don't split signal.
 *
 * Degrades honestly: an unresolvable matchup 404s; individual null fields show
 * the em-dash sentinel and simply don't win their row.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { estimateGameRevenue } from "@bloxscout/core/calculators";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge } from "@/components/data/console";
import { AskBloxscout } from "@/components/cta/ask-bloxscout";
import { buildLandingGraph, type LandingFaq } from "@/app/_money/landing";
import { getFreshness, getGameSnapshot, type GameSnapshot } from "@/lib/data";
import {
  canonicalMatchup,
  resolveMatchup,
  topMatchups,
} from "@/lib/compare";
import {
  displayName,
  genreSlug as toGenreSlug,
  growthPct,
  int,
  slugify,
  usd,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<
  Array<{ matchup: string }>
> {
  const matchups = await topMatchups();
  return matchups.map((matchup) => ({ matchup }));
}

interface PageProps {
  params: Promise<{ matchup: string }>;
}

/** Monthly USD revenue estimate from a snapshot (0 CCU -> 0, never throws). */
function monthlyUsd(s: GameSnapshot): number {
  return estimateGameRevenue({ playing: s.playing, visits: s.visits ?? 0 })
    .estimatedMonthlyUsd;
}

/** Which side wins a metric. 1 = A, 2 = B, 0 = tie/unknown. */
function winner(
  a: number | null,
  b: number | null,
  lowerBetter = false,
): 0 | 1 | 2 {
  const av = a ?? null;
  const bv = b ?? null;
  if (av === null && bv === null) return 0;
  if (av === null) return 2;
  if (bv === null) return 1;
  if (av === bv) return 0;
  const aWins = lowerBetter ? av < bv : av > bv;
  return aWins ? 1 : 2;
}

async function load(matchup: string) {
  const pair = await resolveMatchup(matchup);
  if (!pair) return null;
  const [a, b] = await Promise.all([
    getGameSnapshot(pair.a.universeId),
    getGameSnapshot(pair.b.universeId),
  ]);
  if (!a || !b) return null;
  return { a, b };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { matchup } = await params;
  const loaded = await load(matchup);
  if (!loaded) {
    return { title: "Comparison not found", robots: { index: false, follow: true } };
  }
  const { a, b } = loaded;
  const nameA = displayName(a.name);
  const nameB = displayName(b.name);
  const canonicalSlug = canonicalMatchup(a, b);
  const canonical = `${site.url}/compare/${canonicalSlug}`;
  const { date } = await getFreshness();
  const lead = a.playing >= b.playing ? nameA : nameB;
  const title = `${nameA} vs ${nameB} — Roblox player count & revenue compared`;
  const description = `${nameA} vs ${nameB} on Roblox: live concurrent players, 7-day growth, and estimated revenue side by side as of ${utcStamp(date)}. ${lead} leads on players right now. A bloxscout comparison.`;
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

export default async function ComparePage({ params }: PageProps) {
  const { matchup } = await params;
  const loaded = await load(matchup);
  if (!loaded) notFound();
  const { a, b } = loaded;

  // Canonicalize: redirect any non-canonical ordering/slug to the stable form.
  const canonicalSlug = canonicalMatchup(a, b);
  if (matchup !== canonicalSlug) redirect(`/compare/${canonicalSlug}`);

  const nameA = displayName(a.name);
  const nameB = displayName(b.name);
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const path = `/compare/${canonicalSlug}`;

  const revA = monthlyUsd(a);
  const revB = monthlyUsd(b);
  const ccuWinner = winner(a.playing, b.playing);
  const bigger = ccuWinner === 2 ? nameB : nameA;
  const smaller = ccuWinner === 2 ? nameA : nameB;
  const growthWinner = winner(a.growth7dPct, b.growth7dPct);
  const fasterName =
    growthWinner === 0 ? null : growthWinner === 1 ? nameA : nameB;

  const lead = ccuWinner === 2 ? b : a;
  const trail = ccuWinner === 2 ? a : b;
  const ccuGap =
    lead.playing > 0 && trail.playing > 0
      ? lead.playing / trail.playing
      : null;

  const h1 = `${nameA} vs ${nameB}: which Roblox game is bigger?`;

  const answer =
    ccuWinner === 0
      ? `${nameA} and ${nameB} are neck and neck on Roblox, each with about ${int(a.playing)} concurrent players as of ${stamp}. The full side-by-side of players, growth and estimated revenue is below — a bloxscout comparison from live data, refreshed every 30 minutes.`
      : `As of ${stamp}, ${bigger} is the bigger Roblox game, with ${int(lead.playing)} concurrent players versus ${int(trail.playing)} for ${smaller}${ccuGap && ccuGap >= 1.1 ? ` — about ${ccuGap.toFixed(1)}× more` : ""}.${fasterName ? ` ${fasterName} is growing faster over the past 7 days.` : ""} Full player, growth and revenue comparison below; a bloxscout estimate refreshed every 30 minutes.`;

  type Row = {
    label: string;
    a: string;
    b: string;
    win: 0 | 1 | 2;
  };
  const rows: Row[] = [
    {
      label: "Concurrent players (CCU)",
      a: int(a.playing),
      b: int(b.playing),
      win: ccuWinner,
    },
    {
      label: "24-hour peak",
      a: int(a.peak24h),
      b: int(b.peak24h),
      win: winner(a.peak24h, b.peak24h),
    },
    {
      label: "7-day growth",
      a: growthPct(a.growth7dPct),
      b: growthPct(b.growth7dPct),
      win: growthWinner,
    },
    {
      label: "Est. monthly revenue",
      a: usd(revA),
      b: usd(revB),
      win: winner(revA, revB),
    },
    {
      label: "All-time visits",
      a: int(a.visits),
      b: int(b.visits),
      win: winner(a.visits, b.visits),
    },
    {
      label: "Favorites",
      a: int(a.favorites),
      b: int(b.favorites),
      win: winner(a.favorites, b.favorites),
    },
    {
      label: "Trending rank",
      a: a.rank !== null ? `#${a.rank}` : "—",
      b: b.rank !== null ? `#${b.rank}` : "—",
      win: winner(a.rank, b.rank, true),
    },
    {
      label: "Genre",
      a: a.genre ?? "—",
      b: b.genre ?? "—",
      win: 0,
    },
  ];

  const faqs: LandingFaq[] = [
    {
      question: `Is ${nameA} bigger than ${nameB}?`,
      answer:
        ccuWinner === 0
          ? `They're roughly tied: both have around ${int(a.playing)} concurrent players on Roblox as of ${stamp}.`
          : `${bigger} is bigger by live player count — ${int(lead.playing)} concurrent players versus ${int(trail.playing)} for ${smaller}, as of ${stamp}. bloxscout refreshes both every 30 minutes.`,
    },
    {
      question: `Which makes more money, ${nameA} or ${nameB}?`,
      answer: `bloxscout estimates ${nameA} grosses about ${usd(revA)} per month and ${nameB} about ${usd(revB)}, based on their concurrent players and platform-average monetization. Both are low-confidence estimates — actual revenue varies 5-10x with monetization design.`,
    },
    {
      question: `Is ${nameA} or ${nameB} growing faster?`,
      answer: fasterName
        ? `Over the past 7 days, ${fasterName} is growing faster by concurrent-player change (${growthPct(a.growth7dPct)} for ${nameA} vs ${growthPct(b.growth7dPct)} for ${nameB}).`
        : `7-day growth is comparable or not yet available for both games. bloxscout began tracking on 13 June 2026, so growth figures sharpen as history accumulates.`,
    },
  ];

  const graph = buildLandingGraph({ path, h1, answer, iso, faqs });

  const genreSlugA = a.genre ? toGenreSlug(a.genre) : null;

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
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
                <li className="text-console-foreground">
                  {nameA} vs {nameB}
                </li>
              </ol>
            </nav>

            <FreshnessBadge iso={iso} date={date} className="mb-5" />

            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-[1.1] tracking-tight text-console-foreground sm:text-4xl lg:text-[44px]">
              {h1}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-lg">
              <CardStat name={nameA} ccu={a.playing} leading={ccuWinner === 1} />
              <CardStat name={nameB} ccu={b.playing} leading={ccuWinner === 2} />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          <section aria-labelledby="cmp-heading" className="mb-16">
            <h2
              id="cmp-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              {nameA} vs {nameB}: side-by-side stats
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Live and 24-hour figures plus revenue estimates, measured by
              bloxscout at {stamp}. The leading value in each row is highlighted.
            </p>

            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Side-by-side Roblox statistics for {nameA} and {nameB},
                  measured by bloxscout at {stamp}.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Metric
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {nameA}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {nameB}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.label} className="bg-card">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal text-foreground">
                        {r.label}
                      </th>
                      <td
                        className={`tabular px-4 py-2.5 text-right font-mono ${r.win === 1 ? "font-semibold text-accent" : "text-muted-foreground"}`}
                      >
                        {r.a}
                      </td>
                      <td
                        className={`tabular px-4 py-2.5 text-right font-mono ${r.win === 2 ? "font-semibold text-accent" : "text-muted-foreground"}`}
                      >
                        {r.b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Revenue figures are low-confidence bloxscout estimates. See{" "}
              <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">
                the methodology
              </Link>{" "}
              for cadence and error bars.
            </p>
          </section>

          <AskBloxscout
            heading={`Ask bloxscout: ${nameA} vs ${nameB}`}
            blurb={`Dig past the snapshot — ask how this matchup is trending, who's pulling ahead, and why, answered from bloxscout's live Roblox data.`}
            prompts={[
              `Is ${nameA} or ${nameB} growing faster right now?`,
              `Will ${trail.name ? displayName(trail.name) : smaller} overtake ${lead.name ? displayName(lead.name) : bigger}?`,
              `Compare ${nameA} and ${nameB} revenue over the last month`,
            ]}
          />

          <div className="mb-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href={`/game/${a.universeId}/${slugify(a.name)}`}
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              {nameA} stats &rarr;
            </Link>
            <Link
              href={`/game/${b.universeId}/${slugify(b.name)}`}
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              {nameB} stats &rarr;
            </Link>
            {genreSlugA ? (
              <Link
                href={`/genre/${genreSlugA}`}
                className="font-medium underline underline-offset-4 hover:text-accent"
              >
                Top {a.genre} games &rarr;
              </Link>
            ) : null}
          </div>

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

/** Compact per-game card in the hero, flagged when it leads on CCU. */
function CardStat({
  name,
  ccu,
  leading,
}: {
  name: string;
  ccu: number;
  leading: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${leading ? "border-accent/50 bg-accent/10" : "border-console-muted/30 bg-console-foreground/5"}`}
    >
      <p className="truncate font-heading text-sm font-medium text-console-foreground">
        {name}
      </p>
      <p className="tabular mt-1 font-mono text-2xl text-console-foreground">
        {int(ccu)}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
        playing now{leading ? " · leads" : ""}
      </p>
    </div>
  );
}
