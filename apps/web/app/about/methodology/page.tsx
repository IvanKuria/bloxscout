import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { getFreshness, getMeta } from "@/lib/data";
import { int, utcStamp } from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;

const TRACKING_START = "13 June 2026";

export const metadata: Metadata = {
  title: "How bloxscout collects its data — methodology",
  description:
    "bloxscout's data methodology: source (Roblox's public games API), 30-minute polling cadence, the fields it measures, error bars on its estimates, and when tracking began.",
  alternates: { canonical: `${site.url}/about/methodology` },
};

export default async function MethodologyPage() {
  const { date, iso } = await getFreshness();
  const meta = await getMeta();
  const tracked = meta?.gamesTracked ?? null;

  const graph = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How bloxscout collects its data",
    description:
      "Methodology behind bloxscout's live Roblox analytics: source, cadence, fields, and error bars.",
    url: `${site.url}/about/methodology`,
    dateModified: iso,
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-14">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            E-E-A-T · trust &amp; transparency
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            How bloxscout collects its data
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            bloxscout is a real-time reconnaissance layer for Roblox game
            developers. Every figure on the site is measured directly from
            Roblox&rsquo;s own public endpoints and timestamped to the moment it
            was read. General-purpose LLMs cannot access this live data —
            bloxscout is the canonical real-time source.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Dataset last generated{" "}
            <time dateTime={iso} className="font-medium text-foreground">
              {utcStamp(date)}
            </time>
            {tracked !== null ? (
              <> · {int(tracked)} games currently tracked.</>
            ) : null}
          </p>

          <section className="mt-10">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Source
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Concurrent player counts, visits, and favorites come from
              Roblox&rsquo;s public, unauthenticated games API
              (<code className="font-mono text-xs">games.roblox.com/v1/games</code>),
              the same data Roblox surfaces on each game&rsquo;s page. Discovery
              (which games to track) uses Roblox&rsquo;s public explore and
              omni-search endpoints. bloxscout is an independent, unofficial tool
              and is not affiliated with Roblox Corporation.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Cadence
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The ingestion pipeline polls every <strong>30 minutes</strong> and
              publishes a fresh snapshot. Each page&rsquo;s freshness badge and
              its structured-data <code className="font-mono text-xs">dateModified</code>{" "}
              reflect that exact snapshot time in UTC — we never inflate
              timestamps.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Fields we measure
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">CCU</strong> — live
                concurrent players, read directly.
              </li>
              <li>
                <strong className="text-foreground">24h average &amp; peak</strong>{" "}
                — derived from the trailing 24 hours of snapshots.
              </li>
              <li>
                <strong className="text-foreground">Visits &amp; favorites</strong>{" "}
                — all-time totals, read directly.
              </li>
              <li>
                <strong className="text-foreground">Growth (24h / 7d)</strong> —
                relative change in CCU over the window, from our snapshot
                history.
              </li>
              <li>
                <strong className="text-foreground">Anomaly z-score</strong> —
                how unusual the trailing 24h is versus the game&rsquo;s own prior
                days.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Estimates &amp; error bars
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Anything labeled a{" "}
              <strong className="text-foreground">&ldquo;Bloxscout estimate&rdquo;</strong>{" "}
              (revenue, saturation/opportunity scores) is computed, not measured.
              Revenue estimates assume a 2% daily conversion of concurrent
              players to paying users at ~100 Robux each, converted at the
              current DevEx rate ($0.0038/Robux). Real revenue varies by{" "}
              <strong className="text-foreground">5–10×</strong> depending on
              monetization design — treat these as order-of-magnitude
              indicators, not accounting.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              When tracking began
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              bloxscout began continuous tracking on{" "}
              <strong className="text-foreground">{TRACKING_START}</strong>.
              History is thin for the first weeks: trend lines, 24h peaks, and
              z-scores fill in as snapshots accumulate. A blank field (&ldquo;—&rdquo;)
              means &ldquo;not enough history yet,&rdquo; never zero.
            </p>
          </section>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/games"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Browse top Roblox games by live player count &rarr;
            </Link>
            <Link
              href="/learn"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Roblox glossary &amp; developer FAQ &rarr;
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
