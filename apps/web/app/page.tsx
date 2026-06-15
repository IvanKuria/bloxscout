import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Hero } from "@/components/sections/hero";
import { AgentDemoSection } from "@/components/sections/agent-demo-section";
import { ToolCatalog } from "@/components/sections/tool-catalog";
import { SampleInsight } from "@/components/sections/sample-insight";
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
        {/* Section scheme rhythm (twenty.com): light → muted → light → dark → muted */}
        <Hero />
        <ToolCatalog />
        <AgentDemoSection />
        <SampleInsight />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
