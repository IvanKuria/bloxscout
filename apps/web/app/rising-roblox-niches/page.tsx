import type { Metadata } from "next";
import Link from "next/link";
import { getFreshness, getRisingNiches } from "@/lib/data";
import {
  genreSlug as toGenreSlug,
  growthPct,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";
import {
  ComputingState,
  EstimateHeading,
  type LandingFaq,
  LandingShell,
} from "../_money/landing";

export const revalidate = 1800;

const PATH = "/rising-roblox-niches";
const H1 = "Which Roblox niches are rising right now?";

export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  return {
    title: "Rising Roblox niches — fastest-growing genres with room to win",
    description: `The Roblox niches gaining momentum right now, ranked by bloxscout's rising-niche score as of ${utcStamp(date)}. Growing genres that aren't yet locked up by incumbents. A Bloxscout estimate, refreshed every 30 minutes.`,
    alternates: { canonical: `${site.url}${PATH}` },
    openGraph: {
      type: "article",
      url: `${site.url}${PATH}`,
      title: "Rising Roblox niches",
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
  };
}

export default async function RisingNichesPage() {
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const view = await getRisingNiches();

  const ranked = (view?.entries ?? [])
    .slice()
    .sort((a, b) => b.risingScore - a.risingScore)
    .slice(0, 15);
  const lead = ranked[0];

  const answer = lead
    ? `As of ${stamp}, the fastest-rising Roblox niche is ${lead.genre}, with a bloxscout rising score of ${Math.round(lead.risingScore)}/100${lead.growth7dPct !== null ? ` and ${growthPct(lead.growth7dPct)} player growth over the last 7 days` : ""}. The rising score blends momentum, opportunity, and durability — so it favors niches that are growing and still winnable. The full ranking is below, refreshed every 30 minutes.`
    : `As of ${stamp}, bloxscout ranks the Roblox niches gaining the most momentum by a rising score that blends recent growth, opportunity, and durability. The rankings are populating from live snapshots; the methodology is unchanged. Data refreshes every 30 minutes.`;

  const faqs: LandingFaq[] = [
    {
      question: "What Roblox niches are growing the fastest right now?",
      answer: lead
        ? `As of ${stamp}, ${lead.genre} leads bloxscout's rising-niche ranking with a score of ${Math.round(lead.risingScore)}/100. The score favors genres that combine recent player growth with low incumbent concentration, so it points at niches that are both growing and still winnable. See the full ranked list on this page.`
        : "bloxscout ranks rising niches by a score that combines recent player growth, competitive opportunity, and durability. The live ranking populates on this page as snapshots accumulate.",
    },
    {
      question: "What is the rising-niche score?",
      answer:
        "A 0-100 Bloxscout estimate that multiplies three components: momentum (recent genre growth and anomaly z-score), opportunity (inverse of saturation / incumbent concentration), and durability (whether the growth is holding up over 7 days versus a 24-hour spike). High on all three = a durable, winnable niche.",
    },
    {
      question: "Should I build in the top rising niche?",
      answer:
        "Use it as a starting signal, not a directive. Cross-reference the genre's saturation page and its top games before committing — a niche can be rising fast yet already crowded. The rising score is a computed estimate from live data, not a guarantee of success.",
    },
  ];

  const intro = (
    <>
      <p>
        A niche that&rsquo;s already huge is rarely the one to build in &mdash;
        it&rsquo;s defended. The opportunity is in genres that are{" "}
        <em>climbing</em> but not yet locked up. bloxscout&rsquo;s rising-niche
        score is built to surface exactly those: growing, with room to compete,
        and holding up over time rather than spiking for a day.
      </p>
      <p>
        The score is a computed{" "}
        <strong className="text-foreground">Bloxscout estimate</strong> from
        live, timestamped Roblox data &mdash; momentum &times; opportunity
        &times; durability. Pair it with each genre&rsquo;s saturation page
        before you commit. Chasing a proven hit from elsewhere?{" "}
        <Link
          href="/steam-games-to-clone-on-roblox"
          className="underline underline-offset-4 hover:text-foreground"
        >
          See Steam games going viral now
        </Link>
        .
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
      <section aria-labelledby="rising-heading" className="mb-4">
        <EstimateHeading
          id="rising-heading"
          title="Rising Roblox niches by momentum score"
          subtitle={`Ranked by rising score, measured by bloxscout at ${stamp}.`}
        />
        {ranked.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Rising Roblox niches ranked by bloxscout&rsquo;s momentum
                  score, measured at {stamp}.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">#</th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Niche</th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Rising score</th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">7d growth</th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground md:table-cell">Saturation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ranked.map((e, i) => (
                    <tr key={e.genre} className="bg-card transition-colors hover:bg-secondary">
                      <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <Link href={`/genre/${toGenreSlug(e.genre)}/saturation`} className="font-medium text-foreground underline-offset-4 hover:underline">
                          {e.genre}
                        </Link>
                      </th>
                      <td className="tabular px-4 py-3 text-right font-mono text-foreground">{Math.round(e.risingScore)}/100</td>
                      <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{growthPct(e.growth7dPct)}</td>
                      <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground md:table-cell">
                        {e.saturationScore !== null ? `${Math.round(e.saturationScore)}/100` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Rising scores are computed{" "}
              <strong className="text-foreground">Bloxscout estimates</strong>.{" "}
              {ranked.some((e) => e.durabilityBasis === "24h-only")
                ? "Some durability values still use 24-hour data until weekly history is reliable. "
                : ""}
              See{" "}
              <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">the methodology</Link>.
            </p>
          </>
        ) : (
          <ComputingState what="The rising-niche ranking" />
        )}
      </section>
    </LandingShell>
  );
}
