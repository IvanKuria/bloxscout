/**
 * Glossary / Q&A hub index — `/learn`.
 *
 * Lists every evergreen entry, split into the glossary (terms) and developer
 * questions. Static; the topical-authority anchor that all `/learn/[slug]`
 * pages link back to.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { buildLandingGraph, type LandingFaq } from "@/app/_money/landing";
import { LEARN_ENTRIES, type LearnEntry } from "@/lib/learn";
import { site } from "@/lib/site";

export const dynamic = "force-static";

const UPDATED_ISO = "2026-06-14T00:00:00.000Z";
const PATH = "/learn";
const H1 = "Roblox terms & developer questions";

export const metadata: Metadata = {
  title: "Roblox glossary & developer FAQ — CCU, DevEx, revenue explained",
  description:
    "Plain-English answers to Roblox developer questions: what CCU, DevEx, Robux, visits and genre saturation mean, how Roblox games make money, and how to find a winnable game idea.",
  alternates: { canonical: `${site.url}${PATH}` },
  openGraph: {
    type: "website",
    url: `${site.url}${PATH}`,
    title: "Roblox glossary & developer FAQ",
    siteName: site.name,
  },
};

function Group({ title, entries }: { title: string; entries: LearnEntry[] }) {
  return (
    <section aria-label={title} className="mb-12">
      <h2 className="mb-4 font-heading text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
        {entries.map((e) => (
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
  );
}

export default function LearnIndexPage() {
  const terms = LEARN_ENTRIES.filter((e) => e.type === "term");
  const questions = LEARN_ENTRIES.filter((e) => e.type === "qa");

  const answer =
    "Plain-English answers to the Roblox terms and developer questions that come up most: what CCU, DevEx, Robux, visits, favorites and genre saturation actually mean, how Roblox games make money, and how to find a niche that's still winnable.";

  // FAQ graph from the question-shaped entries.
  const faqs: LandingFaq[] = questions.map((e) => ({
    question: e.question,
    answer: e.short,
  }));

  const graph = buildLandingGraph({
    path: PATH,
    h1: H1,
    answer,
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
                <li className="text-console-foreground">learn</li>
              </ol>
            </nav>
            <h1 className="max-w-2xl font-heading text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl">
              {H1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-6 py-12">
          <Group title="Roblox glossary" entries={terms} />
          <Group title="Roblox developer questions" entries={questions} />

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/roblox-statistics" className="font-medium underline underline-offset-4 hover:text-accent">
              Live Roblox statistics &rarr;
            </Link>
            <Link href="/what-roblox-game-should-i-make" className="font-medium underline underline-offset-4 hover:text-accent">
              What game should I make? &rarr;
            </Link>
            <Link href="/about/methodology" className="font-medium underline underline-offset-4 hover:text-accent">
              Methodology &rarr;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
