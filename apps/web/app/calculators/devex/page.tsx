import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import {
  calculateDevex,
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  DEVEX_PAYOUT_MINIMUM_ROBUX,
} from "@bloxscout/core/calculators";
import { int, usd } from "@/lib/format";
import { site } from "@/lib/site";
import { DevexWidget } from "../_components/devex-widget";

// Pure calculator — no live data. Static.
export const dynamic = "force-static";

const RATE = DEFAULT_DEVEX_RATE_USD_PER_ROBUX;
const EXAMPLE_ROBUX = [1000, 10000, 30000, 100000, 500000, 1000000];
const H1 = "How much is your Robux worth in USD?";

export const metadata: Metadata = {
  title: "Roblox DevEx calculator — how much is your Robux worth in USD?",
  description: `Convert Earned Robux to USD at the current Roblox DevEx rate of $${RATE} per Robux. 100,000 Robux is ${usd(calculateDevex(100000).usd)}. Free Robux-to-USD calculator with the ${int(DEVEX_PAYOUT_MINIMUM_ROBUX)} Robux payout minimum.`,
  alternates: { canonical: `${site.url}/calculators/devex` },
  openGraph: {
    type: "website",
    url: `${site.url}/calculators/devex`,
    title: "Roblox DevEx calculator — Robux to USD",
    siteName: site.name,
  },
};

export default function DevexCalculatorPage() {
  const examples = EXAMPLE_ROBUX.map((r) => ({
    robux: r,
    result: calculateDevex(r),
  }));

  const exampleAnswer = calculateDevex(100000);

  const faqs = [
    {
      question: "How much is 100,000 Robux in USD?",
      answer: `At the current DevEx rate of $${RATE} per Robux, 100,000 Earned Robux is worth ${usd(exampleAnswer.usd)} when cashed out through Roblox's Developer Exchange. You need at least ${int(DEVEX_PAYOUT_MINIMUM_ROBUX)} Robux to request a payout.`,
    },
    {
      question: "What is the Roblox DevEx rate?",
      answer: `Roblox pays out Earned Robux at $${RATE} per Robux (raised from $0.0035 on 5 September 2025). Only Earned Robux — Robux from sales of passes, items, and premium payouts — is eligible; purchased Robux cannot be cashed out.`,
    },
    {
      question: "What is the minimum Robux for DevEx?",
      answer: `You must have at least ${int(DEVEX_PAYOUT_MINIMUM_ROBUX)} Earned Robux (worth ${usd(calculateDevex(DEVEX_PAYOUT_MINIMUM_ROBUX).usd)}) to file a DevEx payout request, plus a verified account meeting Roblox's program requirements.`,
    },
    {
      question: "Is this the same as the price I pay for Robux?",
      answer:
        "No. The DevEx (cash-out) rate is far lower than the retail price you pay to buy Robux. This calculator shows what developers receive when exchanging Earned Robux for USD, not the purchase price.",
    },
  ];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Roblox DevEx calculator",
        url: `${site.url}/calculators/devex`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description:
          "Convert Earned Robux to USD at the current Roblox Developer Exchange rate.",
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
                <li className="text-console-foreground">calculators / devex</li>
              </ol>
            </nav>
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
              {H1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              At Roblox&rsquo;s current Developer Exchange rate of ${RATE} per
              Robux, 100,000 Earned Robux converts to{" "}
              {usd(exampleAnswer.usd)}, and the DevEx payout minimum is{" "}
              {int(DEVEX_PAYOUT_MINIMUM_ROBUX)} Robux ({usd(
                calculateDevex(DEVEX_PAYOUT_MINIMUM_ROBUX).usd,
              )}
              ). Enter any Robux amount below to convert it to USD instantly.
            </p>
            <div className="mt-8 max-w-md">
              <DevexWidget />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <section aria-labelledby="examples-heading" className="mb-12">
            <h2
              id="examples-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              Robux to USD conversion table
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Common Earned Robux amounts at the current DevEx rate of ${RATE}{" "}
              per Robux.
            </p>
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Earned Robux to USD conversions at the Roblox DevEx rate of $
                  {RATE} per Robux.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th
                      scope="col"
                      className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Earned Robux
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      USD (DevEx)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Payout eligible?
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {examples.map((e) => (
                    <tr key={e.robux} className="bg-card">
                      <th
                        scope="row"
                        className="tabular px-4 py-2.5 text-left font-mono font-normal text-foreground"
                      >
                        {int(e.robux)} R$
                      </th>
                      <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">
                        {usd(e.result.usd)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {e.result.payoutMinimumNotMet
                          ? "Below minimum"
                          : "Yes"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <FaqBlock faqs={faqs} />

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/calculators/revenue"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              How much do Roblox games make? &rarr;
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
