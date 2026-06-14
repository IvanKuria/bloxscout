import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge } from "@/components/data/console";
import {
  getFreshness,
  getGenres,
  getSaturationBySlug,
} from "@/lib/data";
import {
  dec,
  genreSlug as toGenreSlug,
  int,
  monthYear,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const genres = await getGenres();
  if (!genres) {
    console.warn(
      "[genre/saturation/generateStaticParams] genres view unavailable — 0 prerendered",
    );
    return [];
  }
  return genres.genres.map((g) => ({ slug: toGenreSlug(g.genre) }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function h1For(genre: string, date: Date): string {
  return `Is the ${genre} genre saturated on Roblox? (${monthYear(date)})`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getSaturationBySlug(slug);
  if (!resolved) {
    return { title: "Genre not found", robots: { index: false, follow: true } };
  }
  const { date } = await getFreshness();
  const { genre, entry } = resolved;
  const canonical = `${site.url}/genre/${slug}/saturation`;
  const title = h1For(genre, date);
  const scored =
    entry && entry.saturationScore !== null
      ? `Saturation score ${Math.round(entry.saturationScore)}/100${entry.whiteSpace ? " — under-served white space" : ""}.`
      : "Saturation scoring is being computed.";
  const description = `Is the ${genre} genre saturated on Roblox? ${scored} Measured as of ${utcStamp(date)} and refreshed every 30 minutes by bloxscout. A Bloxscout estimate combining concentration, intensity and incumbency.`;
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

export default async function GenreSaturationPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await getSaturationBySlug(slug);
  if (!resolved) notFound();

  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const { genre, entry } = resolved;
  const h1 = h1For(genre, date);

  const scored = entry !== null && entry.saturationScore !== null;
  const verdict = scored
    ? entry.whiteSpace
      ? "relatively under-served"
      : (entry.saturationScore as number) >= 66
        ? "highly saturated"
        : (entry.saturationScore as number) >= 33
          ? "moderately competitive"
          : "relatively open"
    : null;

  const answer = scored
    ? `As of ${stamp}, bloxscout scores the ${genre} genre at ${Math.round(entry.saturationScore as number)}/100 on saturation, making it ${verdict} on Roblox. The genre has ${int(entry.gameCount)} tracked games and ${int(entry.totalPlaying)} concurrent players combined, with the top game holding ${(entry.components.top1Share * 100).toFixed(0)}% of players. This is a Bloxscout estimate, refreshed every 30 minutes.`
    : `bloxscout is computing the saturation score for the ${genre} genre. The ranking combines player concentration, competitive intensity and incumbency, and populates once enough snapshot history accumulates — check back shortly. Scores refresh every 30 minutes.`;

  const graph: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${site.url}/genre/${slug}/saturation#webpage`,
        url: `${site.url}/genre/${slug}/saturation`,
        name: h1,
        isPartOf: { "@id": `${site.url}#website` },
        dateModified: iso,
        description: answer,
      },
      {
        "@type": "Article",
        headline: h1,
        description: answer,
        articleBody: answer,
        datePublished: iso,
        dateModified: iso,
        author: { "@type": "Organization", name: site.name, url: site.url },
        publisher: { "@type": "Organization", name: site.name, url: site.url },
        about: { "@type": "Thing", name: `${genre} (Roblox genre)` },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Is the ${genre} genre saturated on Roblox?`,
            acceptedAnswer: { "@type": "Answer", text: answer },
          },
          {
            "@type": "Question",
            name: "How does bloxscout measure genre saturation?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "bloxscout's saturation score (0-100) is a Bloxscout estimate that blends how concentrated players are among the top games (HHI and top-game share), how intensely games compete for those players, and how entrenched the incumbents are. A low score with enough games indicates under-served white space. See the methodology page for the full formula and error bars.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
            <nav
              aria-label="Breadcrumb"
              className="mb-5 font-mono text-xs text-console-muted"
            >
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-console-foreground">
                    bloxscout
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/genre/${slug}`}
                    className="hover:text-console-foreground"
                  >
                    {genre}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">saturation</li>
              </ol>
            </nav>
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>
            {scored ? (
              <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-console-muted">
                    Saturation score
                  </span>
                  <span className="tabular font-heading text-5xl font-semibold leading-none text-console-foreground sm:text-6xl">
                    {Math.round(entry.saturationScore as number)}
                    <span className="text-2xl text-console-muted">/100</span>
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                  <Metric label="Games tracked" value={int(entry.gameCount)} />
                  <Metric
                    label="Players combined"
                    value={int(entry.totalPlaying)}
                  />
                  <Metric
                    label="Verdict"
                    value={
                      entry.whiteSpace ? "White space" : (verdict ?? "—")
                    }
                  />
                </dl>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          {scored ? (
            <section aria-labelledby="components-heading" className="mb-12">
              <h2
                id="components-heading"
                className="mb-1 font-heading text-2xl font-semibold tracking-tight"
              >
                What drives the {genre} saturation score
              </h2>
              <p className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  aria-hidden
                />
                Bloxscout estimate
              </p>
              <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    Components of bloxscout&rsquo;s saturation estimate for the{" "}
                    {genre} Roblox genre, measured at {stamp}.
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left">
                      <th
                        scope="col"
                        className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        Component
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        Value
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        As of
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <Row
                      label="Top-game player share"
                      value={`${(entry.components.top1Share * 100).toFixed(1)}%`}
                      stamp={stamp}
                    />
                    <Row
                      label="Top-3 player share"
                      value={`${(entry.components.top3Share * 100).toFixed(1)}%`}
                      stamp={stamp}
                    />
                    <Row
                      label="Concentration (HHI)"
                      value={dec(entry.components.hhi, 3)}
                      stamp={stamp}
                    />
                    <Row
                      label="Competitive intensity"
                      value={dec(entry.components.intensityScore, 1)}
                      stamp={stamp}
                    />
                    <Row
                      label="Players per game"
                      value={int(entry.components.playersPerGame)}
                      stamp={stamp}
                    />
                    <Row
                      label="Incumbency score"
                      value={
                        entry.components.incumbencyScore !== null
                          ? dec(entry.components.incumbencyScore, 1)
                          : "—"
                      }
                      stamp={stamp}
                    />
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Saturation is a computed{" "}
                <strong className="text-foreground">Bloxscout estimate</strong>,
                not a measured figure. Fields showing &ldquo;—&rdquo; need more
                snapshot history (incumbency depends on how long games have been
                tracked). See{" "}
                <Link
                  href="/about/methodology"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  the methodology
                </Link>{" "}
                for the formula and error bars.
              </p>
            </section>
          ) : (
            <section className="mb-12 rounded-xl border border-border bg-secondary/40 p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {entry?.reason
                  ? `Saturation scoring for ${genre} isn't available yet: ${entry.reason}. `
                  : `Saturation scoring for ${genre} is being computed. `}
                The ranking combines player concentration, competitive intensity
                and incumbency from bloxscout&rsquo;s live snapshot history, and
                populates once enough data accumulates — check back shortly. It
                refreshes every 30 minutes.
              </p>
            </section>
          )}

          <section aria-labelledby="faq-heading" className="mb-4">
            <h2
              id="faq-heading"
              className="mb-5 font-heading text-2xl font-semibold tracking-tight"
            >
              Frequently asked questions
            </h2>
            <dl className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
              <div className="px-5 py-4">
                <dt className="font-heading text-base font-medium text-foreground">
                  Is the {genre} genre saturated on Roblox?
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {answer}
                </dd>
              </div>
              <div className="px-5 py-4">
                <dt className="font-heading text-base font-medium text-foreground">
                  How does bloxscout measure genre saturation?
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The saturation score (0&ndash;100) is a Bloxscout estimate that
                  blends how concentrated players are among the top games, how
                  intensely games compete, and how entrenched the incumbents are.
                  A low score with enough games signals under-served white space.
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href={`/genre/${slug}`}
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Top {genre} games by player count &rarr;
            </Link>
            <Link
              href="/rising-roblox-niches"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Rising Roblox niches &rarr;
            </Link>
            <Link
              href="/what-roblox-game-should-i-make"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              What should I build? &rarr;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
        {label}
      </dt>
      <dd className="tabular font-mono text-lg text-console-foreground">
        {value}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  stamp,
}: {
  label: string;
  value: string;
  stamp: string;
}) {
  return (
    <tr className="bg-card">
      <th
        scope="row"
        className="px-4 py-2.5 text-left font-normal text-foreground"
      >
        {label}
      </th>
      <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">
        {value}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
        {stamp}
      </td>
    </tr>
  );
}
