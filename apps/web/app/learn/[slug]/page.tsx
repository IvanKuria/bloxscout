/**
 * Glossary / Q&A entry page — `/learn/[slug]`.
 *
 * Evergreen, fully static definitional content (the page type answer engines
 * quote). Content lives in `lib/learn.ts`; this is the presentation + JSON-LD
 * shell. The FAQPage graph bundles the entry's own Q&A plus its cross-linked
 * "see also" entries, so each page ships a small, citable Q&A cluster.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { AskBloxscout } from "@/components/cta/ask-bloxscout";
import { buildLandingGraph, type LandingFaq } from "@/app/_money/landing";
import { getLearnEntry, LEARN_ENTRIES } from "@/lib/learn";
import { site } from "@/lib/site";

// Evergreen content — render once at build, no revalidation needed.
export const dynamic = "force-static";

/** Stable "content updated" date for the Article/FAQ graph (bump when edited). */
const UPDATED_ISO = "2026-06-14T00:00:00.000Z";

export function generateStaticParams(): Array<{ slug: string }> {
  return LEARN_ENTRIES.map((e) => ({ slug: e.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getLearnEntry(slug);
  if (!entry) {
    return { title: "Not found", robots: { index: false, follow: true } };
  }
  const canonical = `${site.url}/learn/${entry.slug}`;
  return {
    title: entry.question,
    description: entry.short,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: entry.question,
      description: entry.short,
      siteName: site.name,
    },
    twitter: { card: "summary_large_image", title: entry.question, description: entry.short },
  };
}

export default async function LearnEntryPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getLearnEntry(slug);
  if (!entry) notFound();

  const seeAlso = entry.seeAlso
    .map((s) => getLearnEntry(s))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // FAQ graph: this entry + its cross-links, each a citable Q&A.
  const faqs: LandingFaq[] = [
    { question: entry.question, answer: entry.short },
    ...seeAlso.map((e) => ({ question: e.question, answer: e.short })),
  ];

  const graph = buildLandingGraph({
    path: `/learn/${entry.slug}`,
    h1: entry.question,
    answer: entry.short,
    iso: UPDATED_ISO,
    faqs,
  });

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-3xl px-6 pt-12 pb-10">
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
                  <Link href="/learn" className="hover:text-console-foreground">
                    learn
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">{entry.label}</li>
              </ol>
            </nav>
            <h1 className="max-w-2xl font-heading text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl">
              {entry.question}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {entry.short}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-6 py-12">
          <article className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {entry.body.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </article>

          {entry.related.length > 0 ? (
            <section aria-labelledby="related-heading" className="mt-10">
              <h2
                id="related-heading"
                className="mb-3 font-heading text-lg font-semibold tracking-tight"
              >
                See it live on bloxscout
              </h2>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {entry.related.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="font-medium underline underline-offset-4 hover:text-accent"
                    >
                      {r.label} &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AskBloxscout
            heading="Ask bloxscout"
            blurb="Put the concept to work against live Roblox data — ask for real examples and what it means for your game."
            prompts={[
              entry.question,
              "Show me a live Roblox example of this right now",
              "How should this change which game I build?",
            ]}
          />

          {seeAlso.length > 0 ? (
            <section aria-labelledby="seealso-heading" className="mb-4">
              <h2
                id="seealso-heading"
                className="mb-4 font-heading text-lg font-semibold tracking-tight"
              >
                Related terms &amp; questions
              </h2>
              <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
                {seeAlso.map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`/learn/${e.slug}`}
                      className="block px-5 py-4 transition-colors hover:bg-secondary"
                    >
                      <span className="font-heading text-base font-medium text-foreground">
                        {e.question}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {e.short}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-8 text-sm">
            <Link
              href="/learn"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              &larr; All Roblox terms &amp; questions
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
