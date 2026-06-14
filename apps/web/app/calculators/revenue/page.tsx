import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { estimateGameRevenue } from "@bloxscout/core/calculators";
import { int, usd } from "@/lib/format";
import { site } from "@/lib/site";
import { RevenueWidget } from "../_components/revenue-widget";

// Pure estimator — no live data. Static.
export const dynamic = "force-static";

const EXAMPLE_CCU = [100, 500, 1000, 5000, 25000, 100000];
const H1 = "How much money do Roblox games make?";

const ref = estimateGameRevenue({ playing: 1000, visits: 0 });

export const metadata: Metadata = {
  title: "How much money do Roblox games make? — revenue calculator",
  description: `Estimate Roblox game revenue from concurrent players. A game with 1,000 CCU grosses roughly ${usd(ref.estimatedMonthlyUsd)}/month under platform-average assumptions. Free Roblox revenue calculator — a Bloxscout estimate.`,
  alternates: { canonical: `${site.url}/calculators/revenue` },
  openGraph: {
    type: "website",
    url: `${site.url}/calculators/revenue`,
    title: "Roblox revenue calculator — how much do games make?",
    siteName: site.name,
  },
};

export default function RevenueCalculatorPage() {
  const examples = EXAMPLE_CCU.map((ccu) => ({
    ccu,
    result: estimateGameRevenue({ playing: ccu, visits: 0 }),
  }));

  const faqs = [
    {
      question: "How much money does a Roblox game with 1,000 players make?",
      answer: `Under platform-average assumptions (about 2% of concurrent players spending ~100 Robux per active day), bloxscout estimates a Roblox game holding 1,000 concurrent players grosses roughly ${usd(ref.estimatedMonthlyUsd)} per month before Roblox's platform cut. This is a heuristic Bloxscout estimate — real revenue varies by 5-10x.`,
    },
    {
      question: "How is Roblox game revenue calculated?",
      answer:
        "Daily Robux = concurrent players x conversion rate x average Robux per paying user. Monthly Robux = daily x 30, then converted to USD at the DevEx rate ($0.0038/Robux). bloxscout uses a 2% daily conversion and 100 Robux per payer as platform-average defaults.",
    },
    {
      question: "Why is this only an estimate?",
      answer:
        "Roblox does not publish per-game revenue. Monetization design, gamepass pricing, genre, and audience age all swing earnings by an order of magnitude, so this calculator gives an order-of-magnitude indicator, not accounting. Every figure here is labeled a Bloxscout estimate.",
    },
    {
      question: "Does Roblox take a cut of game revenue?",
      answer:
        "Yes. Robux spent in-game is subject to Roblox's platform fees before a developer's Earned Robux can be cashed out through DevEx. These estimates model gross Robux converted at the DevEx rate; net take-home after all fees is lower.",
    },
  ];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Roblox revenue calculator",
        url: `${site.url}/calculators/revenue`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description:
          "Estimate Roblox game monthly revenue from concurrent players.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: site.name, url: site.url },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
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
                <li className="text-console-foreground">
                  calculators / revenue
                </li>
              </ol>
            </nav>
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
              {H1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              It depends almost entirely on concurrent players and monetization.
              As a Bloxscout estimate, a game holding 1,000 concurrent players
              grosses roughly {usd(ref.estimatedMonthlyUsd)} per month under
              platform-average assumptions (~2% of players paying ~100 Robux per
              active day). Real revenue varies by 5&ndash;10&times;. Enter a
              player count below to estimate any game.
            </p>
            <div className="mt-8 max-w-md">
              <RevenueWidget />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <section aria-labelledby="examples-heading" className="mb-12">
            <h2
              id="examples-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              Estimated Roblox revenue by concurrent players
            </h2>
            <p className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Bloxscout estimate
            </p>
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Estimated monthly Roblox game revenue by concurrent player
                  count, a Bloxscout estimate using platform-average
                  monetization assumptions.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th
                      scope="col"
                      className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Concurrent players
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Est. monthly USD
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell"
                    >
                      Est. monthly Robux
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {examples.map((e) => (
                    <tr key={e.ccu} className="bg-card">
                      <th
                        scope="row"
                        className="tabular px-4 py-2.5 text-left font-mono font-normal text-foreground"
                      >
                        {int(e.ccu)} players
                      </th>
                      <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">
                        {usd(e.result.estimatedMonthlyUsd)}
                      </td>
                      <td className="tabular hidden px-4 py-2.5 text-right font-mono text-muted-foreground sm:table-cell">
                        {int(e.result.estimatedMonthlyRobux)} R$
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              These are computed{" "}
              <strong className="text-foreground">Bloxscout estimates</strong>,
              not measured revenue. Assumptions: {ref.assumptions
                .slice(0, 3)
                .join("; ")}
              . {ref.disclaimer}
            </p>
          </section>

          <FaqBlock faqs={faqs} />

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/calculators/devex"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Robux to USD (DevEx) calculator &rarr;
            </Link>
            <Link
              href="/most-profitable-roblox-game-genres"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Most profitable Roblox genres &rarr;
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

function FaqBlock({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) {
  return (
    <section aria-labelledby="faq-heading">
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
  );
}
