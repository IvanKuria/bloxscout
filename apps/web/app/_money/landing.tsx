/**
 * Shared building blocks for the curated "money" landing pages (Cluster A —
 * highest commercial intent). Each page hand-tunes its editorial intro and
 * exact-match H1, then composes these pieces.
 *
 * The opportunity views (saturation / rising-niches / genre-revenue) are NEW
 * and may be `null` until the pipeline publishes them. Every table here renders
 * an honest "rankings being computed" empty state instead of crashing or
 * faking data.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge } from "@/components/data/console";
import { site } from "@/lib/site";

export interface LandingFaq {
  question: string;
  answer: string;
}

/** Builds the Article + FAQPage @graph shared by every money page. */
export function buildLandingGraph(args: {
  path: string;
  h1: string;
  answer: string;
  iso: string;
  faqs: LandingFaq[];
}): Record<string, unknown> {
  const url = `${site.url}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: args.h1,
        isPartOf: { "@id": `${site.url}#website` },
        dateModified: args.iso,
        description: args.answer,
      },
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: args.h1,
        description: args.answer,
        articleBody: args.answer,
        datePublished: args.iso,
        dateModified: args.iso,
        author: { "@type": "Organization", name: site.name, url: site.url },
        publisher: { "@type": "Organization", name: site.name, url: site.url },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: args.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };
}

/** Full page chrome + answer-first hero. */
export function LandingShell({
  path,
  h1,
  answer,
  iso,
  date,
  faqs,
  intro,
  children,
}: {
  path: string;
  h1: string;
  answer: string;
  iso: string;
  date: Date;
  faqs: LandingFaq[];
  /** Editorial intro paragraphs (below the answer, above the data). */
  intro: ReactNode;
  /** Data sections (tables / empty states). */
  children: ReactNode;
}) {
  const graph = buildLandingGraph({ path, h1, answer, iso, faqs });
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
                <li className="text-console-foreground">opportunity</li>
              </ol>
            </nav>
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[44px]">
              {h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <section className="mb-12 max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
            {intro}
          </section>

          {children}

          <section aria-labelledby="faq-heading" className="mb-4 mt-12">
            <h2
              id="faq-heading"
              className="mb-5 font-heading text-2xl font-semibold tracking-tight"
            >
              Frequently asked questions
            </h2>
            <dl className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
              {faqs.map((f) => (
                <div key={f.question} className="px-5 py-4">
                  <dt className="font-heading text-base font-medium text-foreground">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/best-roblox-games-to-make-2026"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Best games to make in 2026 &rarr;
            </Link>
            <Link
              href="/most-profitable-roblox-game-genres"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Most profitable genres &rarr;
            </Link>
            <Link
              href="/rising-roblox-niches"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Rising niches &rarr;
            </Link>
            <Link
              href="/what-roblox-game-should-i-make"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              What should I make? &rarr;
            </Link>
            <Link
              href="/about/methodology"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Methodology &rarr;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Honest "view not published yet" empty state for the opportunity tables. */
export function ComputingState({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {what} is being computed from bloxscout&rsquo;s live snapshot history.
        These rankings blend momentum, concentration and revenue estimates, and
        populate once enough data accumulates &mdash; check back shortly. Data
        refreshes every 30 minutes.{" "}
        <Link
          href="/games"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Browse live top games in the meantime &rarr;
        </Link>
      </p>
    </div>
  );
}

/** Section heading + "Bloxscout estimate" badge used above computed tables. */
export function EstimateHeading({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <h2
        id={id}
        className="mb-1 font-heading text-2xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      <p className="mb-1 text-sm text-muted-foreground">{subtitle}</p>
      <p className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        Bloxscout estimate
      </p>
    </>
  );
}
