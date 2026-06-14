import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge, GrowthChip } from "@/components/data/console";
import { GamesTable } from "@/components/data/games-table";
import { getFreshness, getGenreBySlug, getGenres } from "@/lib/data";
import {
  displayName,
  genreSlug as toGenreSlug,
  int,
  monthYear,
  slugify,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const genres = await getGenres();
  if (!genres) {
    console.warn("[genre/generateStaticParams] genres view unavailable — 0 prerendered");
    return [];
  }
  const slugs = genres.genres.map((g) => ({ slug: toGenreSlug(g.genre) }));
  console.log(`[genre/generateStaticParams] prerendering ${slugs.length} genre hubs`);
  return slugs;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGenreBySlug(slug);
  if (!data) return { title: "Genre not found", robots: { index: false, follow: true } };
  const { date } = await getFreshness();
  const title = `Top ${data.genre} Roblox games by player count (${monthYear(date)})`;
  const description = `The top ${data.genre} games on Roblox ranked by live concurrent players, as of ${utcStamp(date)}. ${data.aggregate ? `${int(data.aggregate.gameCount)} games, ${int(data.aggregate.totalPlaying)} players combined.` : ""} Refreshed every 30 minutes by bloxscout.`;
  return {
    title,
    description,
    alternates: { canonical: `${site.url}/genre/${slug}` },
  };
}

export default async function GenrePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getGenreBySlug(slug);
  if (!data) notFound();

  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const { genre, aggregate, games } = data;
  const games50 = games.slice(0, 50);

  const answer = `As of ${stamp}, bloxscout tracks ${aggregate ? int(aggregate.gameCount) : int(games.length)} ${genre} games on Roblox${aggregate ? `, with ${int(aggregate.totalPlaying)} concurrent players combined` : ""}. ${games50[0] ? `The most-played is ${displayName(games50[0].name)} (${int(games50[0].playing)} players).` : ""} The full live ranking is below, refreshed every 30 minutes.`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top ${genre} Roblox games by player count`,
    dateModified: iso,
    numberOfItems: games50.length,
    itemListElement: games50.map((g, i) => ({
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
            <nav aria-label="Breadcrumb" className="mb-5 font-mono text-xs text-console-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link href="/" className="hover:text-console-foreground">bloxscout</Link></li>
                <li aria-hidden>/</li>
                <li><Link href="/games" className="hover:text-console-foreground">games</Link></li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">{genre}</li>
              </ol>
            </nav>
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Top {genre} Roblox games by player count ({monthYear(date)})
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>
            {aggregate ? (
              <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 sm:max-w-2xl">
                <Metric label="Games tracked" value={int(aggregate.gameCount)} />
                <Metric label="Players combined" value={int(aggregate.totalPlaying)} />
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">24h growth</dt>
                  <dd className="text-lg"><GrowthChip ratio={aggregate.growth24hPct} /></dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">7d growth</dt>
                  <dd className="text-lg"><GrowthChip ratio={aggregate.growth7dPct} /></dd>
                </div>
              </dl>
            ) : null}
          </div>
        </section>
        <div className="mx-auto max-w-5xl px-6 py-12">
          {games50.length > 0 ? (
            <GamesTable
              entries={games50}
              showGenre={false}
              caption={`Top ${games50.length} ${genre} Roblox games by live concurrent player count, measured by bloxscout at ${stamp}.`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No {genre} games are available in the current snapshot. Data
              refreshes every 30 minutes.
            </p>
          )}
          <p className="mt-6 text-sm">
            <Link href="/games" className="font-medium underline underline-offset-4 hover:text-accent">
              &larr; All top Roblox games
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">{label}</dt>
      <dd className="tabular font-mono text-lg text-console-foreground">{value}</dd>
    </div>
  );
}
