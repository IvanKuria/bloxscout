import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FreshnessBadge } from "@/components/data/console";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { candidateRobloxNiche } from "@/lib/cross-platform";
import { getFreshness, getSteamCatalog, getSteamCatalogEntryBySlug } from "@/lib/data";
import { displayName, int, slugify, utcStamp } from "@/lib/format";
import { analyzeNiche } from "@/lib/niche";
import { site } from "@/lib/site";

export const revalidate = 1800;
export const dynamicParams = true;

/** Cap prebuilt pages; the rest render on demand (dynamicParams) and cache via ISR. */
const PREBUILD_TOP_N = 50;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const catalog = await getSteamCatalog();
  if (!catalog) {
    console.warn("[roblox-version-of/generateStaticParams] catalog unavailable — 0 prerendered");
    return [];
  }
  const slugs = catalog.entries
    .slice()
    .sort((a, b) => b.bestViralityScore - a.bestViralityScore)
    .slice(0, PREBUILD_TOP_N)
    .map((e) => ({ slug: e.slug }));
  console.log(`[roblox-version-of/generateStaticParams] prerendering ${slugs.length} pages`);
  return slugs;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function nicheHref(slug: string | null): string {
  return slug ? `/genre/${slug}` : "/rising-roblox-niches";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getSteamCatalogEntryBySlug(slug);
  if (!entry) {
    return { title: "Game not found", robots: { index: false, follow: true } };
  }
  const path = `/roblox-version-of/${slug}`;
  return {
    title: `Is there a Roblox version of ${entry.name}? (and how to make one)`,
    description: `${entry.name} is going viral off-platform — here's whether a Roblox version exists yet, the closest Roblox games right now, and how to build your own adaptation.`,
    alternates: { canonical: `${site.url}${path}` },
    openGraph: {
      type: "article",
      url: `${site.url}${path}`,
      title: `Roblox version of ${entry.name}`,
      siteName: site.name,
    },
  };
}

export default async function RobloxVersionOfPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getSteamCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const hint = candidateRobloxNiche(entry.tags, entry.genres);

  // Live Roblox games matching the concept — the unique, per-page content that
  // answers "is there a Roblox version" and shows the current competition.
  const niche = await analyzeNiche(entry.name, 8);
  const leaders = niche.ok ? niche.leaders : [];
  const top = leaders[0];

  const answer =
    leaders.length > 0
      ? `Yes — as of ${stamp}, bloxscout finds ${leaders.length} Roblox ${leaders.length === 1 ? "experience" : "experiences"} in the ${entry.name} space${top ? `, the most-played being ${displayName(top.name)} with ${int(top.playing)} live players` : ""}. That's proof the concept ports — the opening is to do it better, faster, or with a sharper hook. The current Roblox field and a build plan are below.`
      : `As of ${stamp}, bloxscout doesn't yet find an established Roblox version of ${entry.name} — which is exactly the opportunity, since off-platform hits get cloned on Roblox within days. Here's how to build the adaptation while the trend is hot.`;

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is there a Roblox version of ${entry.name}?`,
        acceptedAnswer: { "@type": "Answer", text: answer },
      },
      {
        "@type": "Question",
        name: `How do I make a Roblox version of ${entry.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Keep the core loop that made ${entry.name} spread, then adapt it for Roblox: simplify controls, make it mobile-friendly, make the first 30 seconds legible, and monetize with gamepasses instead of an up-front price.${hint ? ` It maps closest to the Roblox ${hint.niche} niche.` : ""} Open it in the bloxscout copilot for a full adaptation brief.`,
        },
      },
      {
        "@type": "Question",
        name: `What is ${entry.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.shortDescription ?? `${entry.name} is an indie game going viral off-platform.`,
        },
      },
    ],
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "bloxscout", item: site.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Steam games to clone on Roblox",
        item: `${site.url}/steam-games-to-clone-on-roblox`,
      },
      { "@type": "ListItem", position: 3, name: `Roblox version of ${entry.name}` },
    ],
  };

  return (
    <>
      <JsonLd data={faq} />
      <JsonLd data={breadcrumb} />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
            <nav aria-label="Breadcrumb" className="mb-5 font-mono text-xs text-console-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link href="/" className="hover:text-console-foreground">bloxscout</Link></li>
                <li aria-hidden>/</li>
                <li><Link href="/steam-games-to-clone-on-roblox" className="hover:text-console-foreground">clone radar</Link></li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">{entry.name}</li>
              </ol>
            </nav>
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Is there a Roblox version of {entry.name}?
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href={entry.storeUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4 hover:text-accent">
                See {entry.name} on Steam &rarr;
              </a>
              <Link href="/app" className="font-medium underline underline-offset-4 hover:text-accent">
                Get the full adaptation brief in the copilot &rarr;
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <section aria-labelledby="field-heading" className="mb-10">
            <h2 id="field-heading" className="mb-4 font-heading text-xl font-semibold text-foreground">
              {entry.name} on Roblox right now
            </h2>
            {leaders.length > 0 ? (
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    Roblox games matching {entry.name}, by live concurrent players, measured at {stamp}.
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left">
                      <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">#</th>
                      <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Roblox game</th>
                      <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Players</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaders.map((g, i) => (
                      <tr key={g.universeId} className="bg-card transition-colors hover:bg-secondary">
                        <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                        <th scope="row" className="px-4 py-3 text-left font-normal">
                          <Link href={`/game/${g.universeId}/${slugify(g.name)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                            {displayName(g.name)}
                          </Link>
                        </th>
                        <td className="tabular px-4 py-3 text-right font-mono text-foreground">{int(g.playing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {niche.note ??
                  `No established Roblox games match ${entry.name} yet — first-mover territory. Data refreshes every 30 minutes.`}
              </p>
            )}
          </section>

          <section aria-labelledby="build-heading">
            <h2 id="build-heading" className="mb-4 font-heading text-xl font-semibold text-foreground">
              How to build the Roblox version
            </h2>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Keep the core loop.</strong> Whatever made {entry.name} spread is the part to preserve — the moment people clip and share.</li>
              <li><strong className="text-foreground">Cut for Roblox.</strong> Simplify controls, make it mobile-first, and make the first 30 seconds instantly legible to a younger, faster audience.</li>
              <li><strong className="text-foreground">Monetize natively.</strong> Gamepasses and in-experience purchases, not an up-front price.</li>
              <li>
                <strong className="text-foreground">Pick the niche.</strong>{" "}
                {hint ? (
                  <>Closest fit: the <Link href={nicheHref(hint.slug)} className="underline underline-offset-4 hover:text-foreground">{hint.niche}</Link> niche.</>
                ) : (
                  <>Cross-reference <Link href="/rising-roblox-niches" className="underline underline-offset-4 hover:text-foreground">rising Roblox niches</Link> for the best fit.</>
                )}
              </li>
            </ul>
            <p className="mt-6 text-sm">
              <Link href="/app" className="font-medium underline underline-offset-4 hover:text-accent">
                Open {entry.name} in the bloxscout copilot
              </Link>{" "}
              for a full adaptation brief: what to keep, what to cut, monetization, art direction, and the best-fit niche.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              The Roblox field is measured live by bloxscout; off-platform signals are a Bloxscout estimate. See{" "}
              <Link href="/steam-games-to-clone-on-roblox" className="underline underline-offset-4 hover:text-foreground">the full clone radar</Link>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
