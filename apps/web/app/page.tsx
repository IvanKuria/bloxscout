import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Hero } from "@/components/sections/hero";
import { ToolCatalog } from "@/components/sections/tool-catalog";
import { IntegrationsBar } from "@/components/sections/integrations-bar";
import { Faq } from "@/components/sections/faq";
import {
  SoftwareApplicationJsonLd,
  FaqJsonLd,
} from "@/components/seo/json-ld";

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FaqJsonLd />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ToolCatalog />
        <IntegrationsBar />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
