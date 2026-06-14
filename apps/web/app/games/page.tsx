import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge } from "@/components/data/console";
import { GamesTable } from "@/components/data/games-table";
import { getFreshness, getTrending } from "@/lib/data";
import { displayName, int, slugify, utcStamp } from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;

const TOP_N = 100;

export const metadata: Metadata = {
  title: "Top Roblox games by live player count right now",
  description:
    "The top Roblox games ranked by live concurrent player count, refreshed every 30 minutes by bloxscout. Live CCU and 7-day growth for each game.",
  alternates: { canonical: `${site.url}/games` },
};

export default async function GamesIndexPage() {
  const { date, iso } = await getFreshness();
  const trending = await getTrending();
  const entries = trending
    ? [...trending.entries].sort((a, b) => b.playing - a.playing).slice(0, TOP_N)
    : [];

  const stamp = utcStamp(date);
  const top = entries[0];
  const answer = top
    ? `As of ${stamp}, the most-played Roblox game tracked by bloxscout is ${displayName(top.name)} with ${int(top.playing)} concurrent players. The full live ranking of the top ${entries.length} games — refreshed every 30 minutes — is below.`
    : `bloxscout's live ranking of the top Roblox games by concurrent players is loading. Data refreshes every 30 minutes.`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top Roblox games by live player count",
    dateModified: iso,
    numberOfItems: entries.length,
    itemListElement: entries.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${displayName(g.name)} — ${int(g.playing)} players`,
      url: `${site.url}/game/${g.universeId}/${slugify(g.name)}`,
    })),
  };

  return (
    <>
      <JsonLd data={itemList} />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
              Top Roblox games by live player count right now
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-5xl px-6 py-12">
          {entries.length > 0 ? (
            <GamesTable
              entries={entries}
              caption={`Top ${entries.length} Roblox games by live concurrent player count, measured by bloxscout at ${stamp}.`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              The live ranking is temporarily unavailable. It refreshes every 30
              minutes.
            </p>
          )}
          <p className="mt-6 text-sm">
            <Link
              href="/roblox-statistics"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              See live Roblox statistics — players by genre, biggest games &amp;
              revenue &rarr;
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
