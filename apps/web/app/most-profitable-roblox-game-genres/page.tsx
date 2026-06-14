import type { Metadata } from "next";
import Link from "next/link";
import { getFreshness, getGenreRevenue } from "@/lib/data";
import { genreSlug as toGenreSlug, int, usd, utcStamp } from "@/lib/format";
import { site } from "@/lib/site";
import {
  ComputingState,
  EstimateHeading,
  type LandingFaq,
  LandingShell,
} from "../_money/landing";

export const revalidate = 1800;

const PATH = "/most-profitable-roblox-game-genres";
const H1 = "What are the most profitable Roblox game genres?";

export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  return {
    title: "Most profitable Roblox game genres — revenue estimates by genre",
    description: `Which Roblox genres make the most money? bloxscout estimates total and per-game monthly revenue for each genre as of ${utcStamp(date)}. A Bloxscout estimate from live data, refreshed every 30 minutes.`,
    alternates: { canonical: `${site.url}${PATH}` },
    openGraph: {
      type: "article",
      url: `${site.url}${PATH}`,
      title: "Most profitable Roblox game genres",
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
  };
}

export default async function MostProfitableGenresPage() {
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const view = await getGenreRevenue();

  const ranked = (view?.entries ?? [])
    .slice()
    .sort((a, b) => b.estTotalMonthlyUsd - a.estTotalMonthlyUsd);
  const lead = ranked[0];

  const answer = lead
    ? `As of ${stamp}, bloxscout estimates the most profitable Roblox genre by total addressable revenue is ${lead.genre}, at roughly ${usd(lead.estTotalMonthlyUsd)} per month across ${int(lead.gameCount)} tracked games. The full genre ranking, with per-game and per-1,000-player figures, is below. These are Bloxscout estimates, refreshed every 30 minutes.`
    : `As of ${stamp}, bloxscout ranks Roblox genres by estimated monthly revenue — total addressable, median per-game, and revenue per 1,000 concurrent players. The genre-revenue estimates are populating from live snapshots; the methodology is unchanged. Data refreshes every 30 minutes.`;

  const conv = view ? (view.assumptions.conversionRate * 100).toFixed(1) : "2.0";
  const robux = view ? view.assumptions.averageRobuxPerPayingUser : 100;

  const faqs: LandingFaq[] = [
    {
      question: "Which Roblox genre makes the most money?",
      answer: lead
        ? `By total addressable revenue, bloxscout estimates ${lead.genre} is the most profitable Roblox genre as of ${stamp}, at about ${usd(lead.estTotalMonthlyUsd)} per month across ${int(lead.gameCount)} tracked games. Profitability per individual game can differ — the table on this page also shows median per-game and per-1,000-player estimates.`
        : "bloxscout ranks genres by estimated total monthly revenue, median per-game revenue, and revenue per 1,000 concurrent players. The live ranking populates on this page as the genre-revenue view publishes.",
    },
    {
      question: "How does bloxscout estimate genre revenue?",
      answer: `It sums per-game revenue estimates within each genre. Each game's estimate assumes about ${conv}% of concurrent players pay ~${robux} Robux per active day, converted to USD at the DevEx rate. This is a low-confidence Bloxscout estimate — real revenue varies by 5-10x with monetization design.`,
    },
    {
      question: "Is total revenue or per-game revenue more useful?",
      answer:
        "For sizing a market, use total addressable revenue. For deciding whether a single game can be profitable, use the median per-game and revenue-per-1,000-CCU figures — a genre can have huge total revenue concentrated in a few incumbents, leaving little for new entrants.",
    },
  ];

  const intro = (
    <>
      <p>
        &ldquo;Most profitable&rdquo; means two different things. A genre can
        have enormous <em>total</em> revenue that&rsquo;s locked up in a couple
        of incumbents, or steady <em>per-game</em> revenue that a newcomer can
        realistically capture. This page reports both, so you can size the
        market and judge whether a single game can pay for itself.
      </p>
      <p>
        Every figure is a low-confidence{" "}
        <strong className="text-foreground">Bloxscout estimate</strong> built
        from live concurrent-player counts and platform-average monetization
        assumptions. Roblox doesn&rsquo;t publish per-game revenue, so treat
        these as order-of-magnitude direction, not accounting.
      </p>
    </>
  );

  return (
    <LandingShell
      path={PATH}
      h1={H1}
      answer={answer}
      iso={iso}
      date={date}
      faqs={faqs}
      intro={intro}
    >
      <section aria-labelledby="rev-heading" className="mb-4">
        <EstimateHeading
          id="rev-heading"
          title="Roblox genres by estimated monthly revenue"
          subtitle={`Total addressable, median per-game, and per-1,000-CCU estimates as of ${stamp}.`}
        />
        {ranked.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Roblox genres ranked by bloxscout&rsquo;s estimated total
                  monthly revenue, measured at {stamp}.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">#</th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Est. total / mo</th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Median game / mo</th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground md:table-cell">Per 1k CCU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ranked.map((e, i) => (
                    <tr key={e.genre} className="bg-card transition-colors hover:bg-secondary">
                      <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <Link href={`/genre/${toGenreSlug(e.genre)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                          {e.genre}
                        </Link>
                      </th>
                      <td className="tabular px-4 py-3 text-right font-mono text-foreground">{usd(e.estTotalMonthlyUsd)}</td>
                      <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{usd(e.estMedianGameMonthlyUsd)}</td>
                      <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground md:table-cell">{usd(e.revenuePerThousandCcuUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {view?.disclaimer}{" "}
              <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">See the methodology</Link>{" "}
              for assumptions and error bars, or try the{" "}
              <Link href="/calculators/revenue" className="underline underline-offset-4 hover:text-foreground">revenue calculator</Link>.
            </p>
          </>
        ) : (
          <ComputingState what="The genre-revenue ranking" />
        )}
      </section>
    </LandingShell>
  );
}
