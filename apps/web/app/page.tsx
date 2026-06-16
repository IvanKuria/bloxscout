import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Hero } from "@/components/sections/hero";
import { AgentDemoSection } from "@/components/sections/agent-demo-section";
import { ToolCatalog } from "@/components/sections/tool-catalog";
import { SampleInsight } from "@/components/sections/sample-insight";
import { PricingTiers } from "@/components/sections/pricing-tiers";
import { Section, Eyebrow } from "@/components/sections/section";
import { Faq } from "@/components/sections/faq";
import { SoftwareApplicationJsonLd, FaqJsonLd } from "@/components/seo/json-ld";

export const revalidate = 1800;

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FaqJsonLd />
      <SiteHeader />
      <main className="flex-1">
        {/* Section rhythm alternates bg-background and bg-muted for calm contrast. */}
        <Hero />
        <ToolCatalog />
        <AgentDemoSection />
        <SampleInsight />
        <Section tone="muted" id="pricing" innerClassName="py-24 sm:py-32">
          <div className="mb-14 max-w-2xl">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
              Simple, honest pricing.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-[1.6] text-muted-foreground">
              Start free, upgrade when the agent earns its keep. No contracts, no
              surprises.
            </p>
          </div>
          <PricingTiers />
        </Section>
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
