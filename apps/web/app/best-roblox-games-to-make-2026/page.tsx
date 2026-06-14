import type { Metadata } from "next";
import Link from "next/link";
import {
  getFreshness,
  getRisingNiches,
  getSaturation,
} from "@/lib/data";
import { genreSlug as toGenreSlug, int, utcStamp } from "@/lib/format";
import { site } from "@/lib/site";
import {
  ComputingState,
  EstimateHeading,
  type LandingFaq,
  LandingShell,
} from "../_money/landing";

export const revalidate = 1800;

const PATH = "/best-roblox-games-to-make-2026";
const H1 = "What are the best Roblox games to make in 2026?";

export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  return {
    title: "Best Roblox games to make in 2026 — data-backed opportunities",
    description: `The best types of Roblox games to make in 2026, ranked by live momentum and under-served white space as of ${utcStamp(date)}. A data-backed Bloxscout opportunity analysis, refreshed every 30 minutes.`,
    alternates: { canonical: `${site.url}${PATH}` },
    openGraph: {
      type: "article",
      url: `${site.url}${PATH}`,
      title: "Best Roblox games to make in 2026",
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
  };
}

export default async function BestGamesToMakePage() {
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const [rising, saturation] = await Promise.all([
    getRisingNiches(),
    getSaturation(),
  ]);

  const topRising = (rising?.entries ?? [])
    .slice()
    .sort((a, b) => b.risingScore - a.risingScore)
    .slice(0, 10);

  const whiteSpace = (saturation?.entries ?? [])
    .filter((e) => e.whiteSpace && e.saturationScore !== null)
    .sort(
      (a, b) => (a.saturationScore as number) - (b.saturationScore as number),
    )
    .slice(0, 8);

  const lead = topRising[0];
  const answer = lead
    ? `As of ${stamp}, the best-positioned Roblox genres to build in 2026 are the ones with rising momentum and room to compete. bloxscout's top opportunity right now is ${lead.genre} (rising score ${Math.round(lead.risingScore)}/100), followed by other niches combining recent growth with low incumbent concentration. The data-backed ranking below is a Bloxscout estimate, refreshed every 30 minutes.`
    : `As of ${stamp}, bloxscout ranks the best Roblox genres to build in 2026 by combining live momentum with under-served "white space" — niches that are growing but not yet dominated by incumbents. The opportunity rankings are populating from live snapshots; the methodology is unchanged. Data refreshes every 30 minutes.`;

  const faqs: LandingFaq[] = [
    {
      question: "What kind of Roblox game should I make in 2026?",
      answer: lead
        ? `Build in a genre that is growing but not yet dominated. As of ${stamp}, bloxscout's highest-momentum opportunity is ${lead.genre} (rising score ${Math.round(lead.risingScore)}/100). Pair a rising niche with an under-served one for the best risk/reward — see the white-space table on this page.`
        : "Build in a genre that is growing but not yet dominated by a few incumbents. bloxscout ranks these by a rising-momentum score and a saturation score; the live rankings populate on this page as snapshots accumulate.",
    },
    {
      question: "How does bloxscout decide the best games to make?",
      answer:
        "It is a Bloxscout estimate combining a rising-niche momentum score (recent genre growth x opportunity x durability) with a saturation score (how concentrated and entrenched the genre's players are). High momentum plus low saturation flags the best-positioned opportunities. See the methodology page for the formula and error bars.",
    },
    {
      question: "Is this based on real Roblox data?",
      answer:
        "Yes. Every input comes from bloxscout's live tracking of Roblox's public games API, refreshed every 30 minutes. General-purpose LLMs cannot see this live data, so the rankings here are the canonical, timestamped source. The scores themselves are computed estimates, not measured revenue.",
    },
  ];

  const intro = (
    <>
      <p>
        The most valuable question a pre-build Roblox developer can ask
        isn&rsquo;t &ldquo;what&rsquo;s popular&rdquo; &mdash; it&rsquo;s
        &ldquo;what&rsquo;s growing that I can still win.&rdquo; A genre at the
        top of the charts is usually locked up by a handful of incumbents; the
        opportunity lives in niches with rising momentum and room to compete.
      </p>
      <p>
        bloxscout scores every tracked genre on two axes: a{" "}
        <strong className="text-foreground">rising-niche momentum</strong> score
        and a <strong className="text-foreground">saturation</strong> score. The
        sweet spot is high momentum with low saturation. Both are computed
        Bloxscout estimates from live, timestamped data &mdash; treat them as
        order-of-magnitude direction, not guarantees.
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
      <section aria-labelledby="rising-heading" className="mb-12">
        <EstimateHeading
          id="rising-heading"
          title="Top rising Roblox genres to build in 2026"
          subtitle={`Ranked by momentum score, measured by bloxscout at ${stamp}.`}
        />
        {topRising.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Top rising Roblox genres to build in 2026, ranked by bloxscout&rsquo;s
                momentum score, measured at {stamp}.
              </caption>
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">#</th>
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</th>
                  <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Rising score</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Saturation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topRising.map((e, i) => (
                  <tr key={e.genre} className="bg-card transition-colors hover:bg-secondary">
                    <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/genre/${toGenreSlug(e.genre)}/saturation`} className="font-medium text-foreground underline-offset-4 hover:underline">
                        {e.genre}
                      </Link>
                    </th>
                    <td className="tabular px-4 py-3 text-right font-mono text-foreground">{Math.round(e.risingScore)}/100</td>
                    <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">
                      {e.saturationScore !== null ? `${Math.round(e.saturationScore)}/100` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ComputingState what="The rising-niche ranking" />
        )}
      </section>

      <section aria-labelledby="whitespace-heading" className="mb-4">
        <EstimateHeading
          id="whitespace-heading"
          title="Under-served Roblox genres (white space)"
          subtitle={`Low-saturation genres with room to compete, as of ${stamp}.`}
        />
        {whiteSpace.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Under-served Roblox genres ranked by lowest saturation score,
                measured by bloxscout at {stamp}.
              </caption>
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</th>
                  <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Saturation</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Games</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Top-1 share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {whiteSpace.map((e) => (
                  <tr key={e.genre} className="bg-card transition-colors hover:bg-secondary">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/genre/${toGenreSlug(e.genre)}/saturation`} className="font-medium text-foreground underline-offset-4 hover:underline">
                        {e.genre}
                      </Link>
                    </th>
                    <td className="tabular px-4 py-3 text-right font-mono text-foreground">{Math.round(e.saturationScore as number)}/100</td>
                    <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{int(e.gameCount)}</td>
                    <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{(e.components.top1Share * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ComputingState what="The white-space ranking" />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Scores are computed{" "}
          <strong className="text-foreground">Bloxscout estimates</strong>. See{" "}
          <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">the methodology</Link>{" "}
          for the formula and error bars.
        </p>
      </section>
    </LandingShell>
  );
}
