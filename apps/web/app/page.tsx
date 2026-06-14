import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { Hero } from "@/components/sections/hero";
import type { HeroIcon } from "@/components/sections/hero-float-cluster";
import { NicheShowcaseSection } from "@/components/sections/niche-showcase-section";
import type { ShowcaseGame } from "@/components/sections/niche-carousel";
import { AgentDemoSection } from "@/components/sections/agent-demo-section";
import { ToolCatalog } from "@/components/sections/tool-catalog";
import { SampleInsight } from "@/components/sections/sample-insight";
import { Faq } from "@/components/sections/faq";
import { SoftwareApplicationJsonLd, FaqJsonLd } from "@/components/seo/json-ld";
import { getTrending } from "@/lib/data";
import { getThumbnails } from "@/lib/thumbnails";

// Refresh icons roughly in step with the dataset (~30 min).
export const revalidate = 1800;

/**
 * Assemble real game icons for the homepage's interactive surfaces, server-side.
 *
 * Pulls the live trending view (`getTrending`) for the most-played universe ids,
 * batches their icons through `getThumbnails` (one Roblox icons request), and
 * keeps only the entries that resolved to a real URL. Everything degrades to an
 * empty list on any failure / thin data, and each consumer renders a graceful
 * fallback when handed nothing.
 */
async function getHomepageGames(): Promise<{
  heroIcons: HeroIcon[];
  showcase: ShowcaseGame[];
  trailIcons: string[];
}> {
  const trending = await getTrending();
  const entries = (trending?.entries ?? [])
    .slice()
    .sort((a, b) => b.playing - a.playing)
    .slice(0, 24);

  if (entries.length === 0) {
    return { heroIcons: [], showcase: [], trailIcons: [] };
  }

  const icons = await getThumbnails(entries.map((e) => e.universeId));

  const withIcon = entries
    .map((e) => ({ entry: e, url: icons.get(e.universeId) ?? null }))
    .filter((x): x is { entry: (typeof entries)[number]; url: string } =>
      Boolean(x.url),
    );

  const heroIcons: HeroIcon[] = withIcon.map(({ entry, url }) => ({
    id: entry.universeId,
    url,
    name: entry.name,
  }));

  const showcase: ShowcaseGame[] = withIcon
    .filter(({ entry }) => entry.name)
    .map(({ entry, url }) => ({
      id: entry.universeId,
      name: entry.name as string,
      genre: entry.genre,
      playing: entry.playing,
      icon: url,
    }));

  return {
    heroIcons,
    showcase,
    trailIcons: heroIcons.map((i) => i.url),
  };
}

export default async function HomePage() {
  const { heroIcons, showcase, trailIcons } = await getHomepageGames();

  return (
    <>
      <SoftwareApplicationJsonLd />
      <FaqJsonLd />
      <SiteHeader />
      <main className="flex-1">
        <Hero icons={heroIcons} />
        <ToolCatalog />
        <NicheShowcaseSection games={showcase} />
        <AgentDemoSection />
        <SampleInsight />
        <Faq />
      </main>
      <SiteFooter trailIcons={trailIcons} />
    </>
  );
}
