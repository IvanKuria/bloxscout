import type { Metadata } from "next";
import Link from "next/link";
import {
  getBreakouts,
  getFreshness,
  getRisingNiches,
  getSaturation,
} from "@/lib/data";
import {
  displayName,
  genreSlug as toGenreSlug,
  growthPct,
  int,
  slugify,
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

const PATH = "/what-roblox-game-should-i-make";
const H1 = "What Roblox game should I make?";

export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  return {
    title: "What Roblox game should I make? — a data-backed answer",
    description: `Not sure what Roblox game to build? bloxscout points you at niches that are rising and still winnable, using live data as of ${utcStamp(date)}. A Bloxscout opportunity analysis, refreshed every 30 minutes.`,
    alternates: { canonical: `${site.url}${PATH}` },
    openGraph: {
      type: "article",
      url: `${site.url}${PATH}`,
      title: "What Roblox game should I make?",
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
  };
}

export default async function WhatToMakePage() {
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const [rising, saturation, breakouts] = await Promise.all([
    getRisingNiches(),
    getSaturation(),
    getBreakouts(),
  ]);

  const topRising = (rising?.entries ?? [])
    .slice()
    .sort((a, b) => b.risingScore - a.risingScore)
    .slice(0, 8);

  const whiteSpace = (saturation?.entries ?? [])
    .filter((e) => e.whiteSpace && e.saturationScore !== null)
    .sort(
      (a, b) => (a.saturationScore as number) - (b.saturationScore as number),
    )
    .slice(0, 6);

  const breakoutGames = (breakouts?.entries ?? [])
    .slice()
    .sort((a, b) => (b.zScore24h ?? -Infinity) - (a.zScore24h ?? -Infinity))
    .slice(0, 8);

  const lead = topRising[0];
  const answer = lead
    ? `If you're deciding what Roblox game to make, bloxscout's data points at ${lead.genre} as the strongest opportunity as of ${stamp} (rising score ${Math.round(lead.risingScore)}/100) — a niche that's growing and not yet dominated. The best strategy is to build in a rising niche with low saturation, then study the games currently breaking out for execution patterns. The data-backed picks are below, refreshed every 30 minutes.`
    : `If you're deciding what Roblox game to make, the data-backed answer is to build in a niche that's growing but not yet dominated by incumbents. bloxscout ranks these by a rising-momentum score and a saturation score; the live picks are populating from snapshots. Data refreshes every 30 minutes.`;

  const faqs: LandingFaq[] = [
    {
      question: "What Roblox game should I make as a beginner?",
      answer: lead
        ? `Pick a niche that's rising but still winnable rather than chasing the top of the charts. As of ${stamp}, bloxscout's strongest signal is ${lead.genre} (rising score ${Math.round(lead.risingScore)}/100). Start small within that niche, study the games currently breaking out, and ship fast — the lists on this page give you concrete targets.`
        : "Pick a niche that's growing but not yet dominated, rather than copying the #1 game. bloxscout ranks these by rising-momentum and saturation scores; the live picks populate on this page as snapshots accumulate.",
    },
    {
      question: "How does bloxscout decide what game I should make?",
      answer:
        "It cross-references three live signals: a rising-niche score (which genres are gaining momentum), a saturation score (which genres still have room), and current breakout games (what's executing well right now). High momentum + low saturation + a breakout to learn from is the strongest combination. All are Bloxscout estimates from live data.",
    },
    {
      question: "Is it too late to start making Roblox games?",
      answer:
        "No — but copying yesterday's hit is. New games break out constantly; the breakout table on this page is recomputed every 30 minutes from live concurrent-player anomalies. The opportunity is in rising, under-served niches, which is exactly what these rankings surface.",
    },
  ];

  const intro = (
    <>
      <p>
        There&rsquo;s no single right answer &mdash; but there is a{" "}
        <strong className="text-foreground">data-backed strategy</strong>: build
        in a niche that&rsquo;s rising, isn&rsquo;t yet locked up by incumbents,
        and has a recent breakout you can learn from. This page combines all
        three live signals so you can pick a direction with evidence instead of
        a hunch.
      </p>
      <p>
        Every ranking is a computed{" "}
        <strong className="text-foreground">Bloxscout estimate</strong> from
        live Roblox data, refreshed every 30 minutes. Use it to narrow your
        options, then dig into the linked genre and game pages.
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
          title="Step 1 — pick a rising niche"
          subtitle={`Genres gaining momentum, by rising score, as of ${stamp}.`}
        />
        {topRising.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Rising Roblox niches by bloxscout momentum score at {stamp}.</caption>
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Niche</th>
                  <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Rising score</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">7d growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topRising.map((e) => (
                  <tr key={e.genre} className="bg-card transition-colors hover:bg-secondary">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/genre/${toGenreSlug(e.genre)}/saturation`} className="font-medium text-foreground underline-offset-4 hover:underline">{e.genre}</Link>
                    </th>
                    <td className="tabular px-4 py-3 text-right font-mono text-foreground">{Math.round(e.risingScore)}/100</td>
                    <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{growthPct(e.growth7dPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ComputingState what="The rising-niche ranking" />
        )}
      </section>

      <section aria-labelledby="ws-heading" className="mb-12">
        <EstimateHeading
          id="ws-heading"
          title="Step 2 — favor under-served genres"
          subtitle={`Low-saturation genres with room to compete, as of ${stamp}.`}
        />
        {whiteSpace.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Under-served Roblox genres by lowest saturation score at {stamp}.</caption>
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</th>
                  <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Saturation</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Games</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {whiteSpace.map((e) => (
                  <tr key={e.genre} className="bg-card transition-colors hover:bg-secondary">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/genre/${toGenreSlug(e.genre)}/saturation`} className="font-medium text-foreground underline-offset-4 hover:underline">{e.genre}</Link>
                    </th>
                    <td className="tabular px-4 py-3 text-right font-mono text-foreground">{Math.round(e.saturationScore as number)}/100</td>
                    <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{int(e.gameCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ComputingState what="The white-space ranking" />
        )}
      </section>

      <section aria-labelledby="break-heading" className="mb-4">
        <h2 id="break-heading" className="mb-1 font-heading text-2xl font-semibold tracking-tight">
          Step 3 — learn from what&rsquo;s breaking out
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Games with the biggest recent player anomalies, measured by bloxscout at {stamp}. These are live, not estimates.
        </p>
        {breakoutGames.length > 0 ? (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Breakout Roblox games by 24-hour anomaly z-score at {stamp}.</caption>
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Game</th>
                  <th scope="col" className="hidden px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Genre</th>
                  <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Players now</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">24h growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {breakoutGames.map((g) => (
                  <tr key={g.universeId} className="bg-card transition-colors hover:bg-secondary">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/game/${g.universeId}/${slugify(g.name)}`} className="font-medium text-foreground underline-offset-4 hover:underline">{displayName(g.name)}</Link>
                    </th>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">{g.genre ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-right font-mono text-foreground">{int(g.playing)}</td>
                    <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{growthPct(g.growth24hPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ComputingState what="The breakout list" />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          See the full{" "}
          <Link href="/trending" className="underline underline-offset-4 hover:text-foreground">fastest-growing games</Link>{" "}
          or read{" "}
          <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">the methodology</Link>.
        </p>
      </section>
    </LandingShell>
  );
}
