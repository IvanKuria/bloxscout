import type { Metadata } from "next";
import Link from "next/link";
import { candidateRobloxNiche } from "@/lib/cross-platform";
import { getFreshness, getSteamBreakouts } from "@/lib/data";
import { utcStamp } from "@/lib/format";
import { site } from "@/lib/site";
import {
  ComputingState,
  EstimateHeading,
  type LandingFaq,
  LandingShell,
} from "../_money/landing";

export const revalidate = 1800;

const PATH = "/steam-games-to-clone-on-roblox";
const H1 = "What Steam games are blowing up right now (and worth cloning on Roblox)?";

function nicheHref(slug: string | null): string {
  return slug ? `/genre/${slug}` : "/rising-roblox-niches";
}

export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  return {
    title: "Steam games going viral now — Roblox clone candidates",
    description: `Indie games blowing up on Steam right now, ranked by virality velocity as of ${utcStamp(date)} — the strongest candidates to adapt as a Roblox game while the trend is hot. A Bloxscout radar, refreshed daily.`,
    alternates: { canonical: `${site.url}${PATH}` },
    openGraph: {
      type: "article",
      url: `${site.url}${PATH}`,
      title: "Steam games to clone on Roblox",
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
  };
}

export default async function SteamCloneRadarPage() {
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const view = await getSteamBreakouts();

  const ranked = (view?.entries ?? [])
    .slice()
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .slice(0, 15);
  const lead = ranked[0];

  const leadVel =
    lead?.reviewVelocityPerDay != null
      ? `${Math.round(lead.reviewVelocityPerDay).toLocaleString()} reviews/day`
      : null;

  const answer = lead
    ? `As of ${stamp}, the fastest-rising off-platform game is ${lead.name} — a virality score of ${Math.round(lead.viralityScore)}/100${leadVel ? `, pulling ~${leadVel}` : ""}${lead.ageDays != null ? `, only ${lead.ageDays} days old` : ""}. Games this hot get Roblox adaptations within days, so the window to ship a version is now. The full radar is below, refreshed daily.`
    : `As of ${stamp}, bloxscout's cross-platform radar ranks indie games going viral on Steam by a virality score (review velocity, player growth, and recency) — the strongest candidates to adapt as a Roblox game. The radar populates daily; check back as Steam's trending lists move.`;

  const faqs: LandingFaq[] = [
    {
      question: "What Steam games are going viral right now?",
      answer: lead
        ? `As of ${stamp}, ${lead.name} tops bloxscout's cross-platform radar with a virality score of ${Math.round(lead.viralityScore)}/100${leadVel ? ` (~${leadVel})` : ""}. The radar ranks Steam's fastest risers by review velocity, player growth, and recency. The full ranked list is on this page.`
        : "bloxscout's radar ranks Steam's fastest-rising games by review velocity, player growth, and recency. The live ranking populates on this page as the daily scan runs.",
    },
    {
      question: "How do I adapt a Steam game for Roblox?",
      answer:
        "Keep the core loop that made it spread, then cut anything that fights Roblox's audience and session length: simplify controls, lean mobile-friendly, make the first 30 seconds legible, and monetize with gamepasses rather than an up-front price. Open any game in the bloxscout copilot for a full adaptation brief (what to keep, what to cut, monetization, art direction, and the best-fit Roblox niche).",
    },
    {
      question: "What is the virality score?",
      answer:
        "A 0-100 Bloxscout estimate blending review velocity (new Steam reviews per day), player-count growth, recency (how recently it launched), and reception. It is tuned to surface games breaking out RIGHT NOW, not all-time hits — the ones where a fast Roblox adaptation can still catch the wave.",
    },
  ];

  const intro = (
    <>
      <p>
        The fastest way to a hit on Roblox isn&rsquo;t inventing a new genre
        &mdash; it&rsquo;s spotting a game that&rsquo;s already proven it can go
        viral somewhere else and shipping the Roblox version{" "}
        <em>before anyone else does</em>. When a Steam indie breaks out, Roblox
        adaptations show up within days; speed is the whole game.
      </p>
      <p>
        This radar is a computed{" "}
        <strong className="text-foreground">Bloxscout estimate</strong> from
        live Steam signals &mdash; review velocity &times; player growth &times;
        recency. Pick a breakout, then open it in the copilot for a full Roblox
        adaptation brief.
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
      <section aria-labelledby="radar-heading" className="mb-4">
        <EstimateHeading
          id="radar-heading"
          title="Steam breakouts by virality score"
          subtitle={`Ranked by virality score, measured by bloxscout at ${stamp}.`}
        />
        {ranked.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Steam games going viral, ranked by bloxscout&rsquo;s virality
                  score, measured at {stamp}.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">#</th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Game</th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Virality</th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Reviews/day</th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground md:table-cell">Age</th>
                    <th scope="col" className="hidden px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground lg:table-cell">Roblox niche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ranked.map((e, i) => {
                    const hint = candidateRobloxNiche(e.tags, e.genres);
                    return (
                      <tr key={e.appId} className="bg-card transition-colors hover:bg-secondary">
                        <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                        <th scope="row" className="px-4 py-3 text-left font-normal">
                          <a href={e.storeUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
                            {e.name}
                          </a>
                        </th>
                        <td className="tabular px-4 py-3 text-right font-mono text-foreground">{Math.round(e.viralityScore)}/100</td>
                        <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">
                          {e.reviewVelocityPerDay != null ? `~${Math.round(e.reviewVelocityPerDay).toLocaleString()}` : "—"}
                        </td>
                        <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground md:table-cell">
                          {e.ageDays != null ? `${e.ageDays}d` : "—"}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {hint ? (
                            <Link href={nicheHref(hint.slug)} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                              {hint.niche}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Virality scores are computed{" "}
              <strong className="text-foreground">Bloxscout estimates</strong>{" "}
              from live Steam signals.{" "}
              {ranked.some((e) => e.observationBasis === "first-seen")
                ? "Some velocities are launch-to-date approximations until a second daily scan lands. "
                : ""}
              See{" "}
              <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">the methodology</Link>.
            </p>
          </>
        ) : (
          <ComputingState what="The Steam breakout radar" />
        )}
      </section>
    </LandingShell>
  );
}
