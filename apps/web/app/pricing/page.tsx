import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { PricingTiers } from "@/components/sections/pricing-tiers";
import { Section, Eyebrow } from "@/components/sections/section";
import { CtaLink } from "@/components/sections/cta-link";
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
        <section
          data-scheme="light"
          className="relative overflow-hidden bg-background"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_-15%,rgba(28,28,28,0.05),transparent_60%)]"
          />
          <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-16 text-center sm:pt-28">
            <Eyebrow className="justify-center">Pricing</Eyebrow>
            <h1 className="mt-6 text-[2.75rem] leading-[1.04] font-light tracking-[-0.04em] text-foreground sm:text-[3.5rem]">
              Priced to pay for itself.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-[1.6] text-foreground/60">
              One winning idea is worth more than a year of bloxscout. Start
              free, then upgrade when you want the agent watching the whole
              Roblox economy for you.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <Section scheme="muted" innerClassName="py-20 sm:py-24">
          <PricingTiers />
          <p className="mt-10 text-center font-mono text-[11px] tracking-[0.04em] text-foreground/45">
            Paid plans complete checkout after you sign in. Prices in USD ·
            cancel anytime.
          </p>
        </Section>

        {/* FAQ */}
        <Section scheme="light" innerClassName="max-w-3xl py-20 sm:py-24">
          <h2 className="mb-10 text-[1.75rem] font-light tracking-[-0.04em] text-foreground sm:text-[2.25rem]">
            Pricing questions.
          </h2>
          <dl className="divide-y divide-foreground/10 border-t border-foreground/10">
            {FAQ.map((item) => (
              <div key={item.q} className="py-7">
                <dt className="text-[16px] font-normal tracking-[-0.01em] text-foreground">
                  {item.q}
                </dt>
                <dd className="mt-2.5 text-[14.5px] leading-relaxed text-foreground/60">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-14 flex flex-col items-start gap-5 rounded-lg border border-foreground/12 bg-muted-surface p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-light tracking-[-0.02em] text-foreground">
                Still deciding? Start on Free.
              </p>
              <p className="mt-1.5 text-[13.5px] text-foreground/55">
                Ask the agent a real question in under a minute.
              </p>
            </div>
            <CtaLink href="/signup" className="shrink-0">
              Start free
            </CtaLink>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
