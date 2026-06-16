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
    "bloxscout pricing — start free, then upgrade to Pro for unlimited questions, saturation and rising-niche scans, and historical data. Monthly or annual.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: `${site.url}/pricing`,
    title: `Pricing — ${site.name}`,
    description:
      "Start free. Upgrade to Pro for unlimited questions and deeper scans. Monthly or annual billing.",
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
    a: "Unlimited questions, saturation and rising-niche scans, historical snapshots and genre momentum, and the ability to export any answer.",
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
        <section className="relative overflow-hidden bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent-tint),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-16 text-center sm:pt-28">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mt-6 text-[2.75rem] leading-[1.04] font-semibold tracking-tight text-foreground sm:text-[3.5rem]">
              Priced to pay for itself.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-[1.6] text-muted-foreground">
              One winning idea is worth more than a year of bloxscout. Start
              free, then upgrade when you want the agent watching the whole
              Roblox economy for you.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <Section tone="muted" innerClassName="py-20 sm:py-24">
          <PricingTiers />
          <p className="mt-10 text-center text-[13px] text-muted-foreground">
            Paid plans complete checkout after you sign in. Prices in USD ·
            cancel anytime.
          </p>
        </Section>

        {/* FAQ */}
        <Section tone="plain" innerClassName="max-w-3xl py-20 sm:py-24">
          <h2 className="mb-10 text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2.25rem]">
            Pricing questions.
          </h2>
          <dl className="divide-y divide-border border-t border-border">
            {FAQ.map((item) => (
              <div key={item.q} className="py-7">
                <dt className="text-[16px] font-medium tracking-[-0.01em] text-foreground">
                  {item.q}
                </dt>
                <dd className="mt-2.5 text-[14.5px] leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-14 flex flex-col items-start gap-5 rounded-2xl border border-border bg-muted p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                Still deciding? Start on Free.
              </p>
              <p className="mt-1.5 text-[13.5px] text-muted-foreground">
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
