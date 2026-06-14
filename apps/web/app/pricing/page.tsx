import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { PricingTiers } from "@/components/sections/pricing-tiers";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "bloxscout pricing — start free, then upgrade to Pro or Studio for unlimited questions, saturation and rising-niche scans, historical data, and team seats. Monthly or annual.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: `${site.url}/pricing`,
    title: `Pricing — ${site.name}`,
    description:
      "Start free. Upgrade for unlimited questions, deeper scans, and team seats. Monthly or annual billing.",
    siteName: site.name,
    locale: "en_US",
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I start without paying?",
    a: "Yes. The Free plan lets you ask the agent a handful of questions a day and browse the public trending and breakout feeds — no card required. Upgrade only when you want the full firehose.",
  },
  {
    q: "What does a paid plan unlock?",
    a: "Unlimited questions, saturation and rising-niche scans, historical snapshots and genre momentum, and the ability to export any answer. Studio adds team seats, priority data refresh, and private competitor watchlists.",
  },
  {
    q: "Monthly or annual?",
    a: "Either. Annual billing is the equivalent of two months free. You can switch the toggle above to compare, and change plans whenever you like.",
  },
  {
    q: "Is the data really live?",
    a: "Yes — every answer is grounded in current Roblox player data, refreshed roughly every 30 minutes. The agent reasons over what's happening now, not a stale snapshot.",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_-10%,rgba(226,35,26,0.06),transparent_60%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(10,10,10,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.025)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent_75%)]"
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-14 sm:pt-24 sm:pb-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-4 inline-flex items-center justify-center gap-2 font-mono text-xs tracking-[0.18em] text-accent uppercase">
                <span className="h-px w-6 bg-accent" aria-hidden />
                Pricing
                <span className="h-px w-6 bg-accent" aria-hidden />
              </p>
              <h1 className="font-heading text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-[56px] sm:leading-[1.03]">
                Priced to pay for itself.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                One winning idea is worth more than a year of bloxscout. Start
                free, then upgrade when you want the agent watching the whole
                Roblox economy for you.
              </p>
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <PricingTiers />
            <p className="mt-10 text-center font-mono text-xs text-muted-foreground">
              Paid plans complete checkout after you sign in. Prices in USD ·
              cancel anytime.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
            <h2 className="mb-10 font-heading text-2xl font-semibold tracking-[-0.01em] text-foreground sm:text-3xl">
              Pricing questions.
            </h2>
            <dl className="divide-y divide-border">
              {FAQ.map((item) => (
                <div key={item.q} className="py-6 first:pt-0">
                  <dt className="font-heading text-base font-medium text-foreground">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-border bg-secondary/50 p-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">
                  Still deciding? Start on Free.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask the agent a real question in under a minute.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex shrink-0 items-center rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-[0_10px_24px_-12px_rgba(226,35,26,0.7)] transition-colors hover:bg-accent-hover"
              >
                Start free
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
