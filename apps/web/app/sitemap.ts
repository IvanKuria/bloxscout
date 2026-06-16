import type { MetadataRoute } from "next";
import { getFreshness, getGenres, getSteamCatalog, getTrending } from "@/lib/data";
import { topMatchups } from "@/lib/compare";
import { LEARN_ENTRIES } from "@/lib/learn";
import { genreSlug as toGenreSlug, slugify } from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;

/** Cap game URLs to the most-played games to keep the sitemap focused. */
const GAME_URL_CAP = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { generatedAt } = await getFreshness();
  const [trending, genres, steamCatalog] = await Promise.all([
    getTrending(),
    getGenres(),
    getSteamCatalog(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, lastModified: generatedAt, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/pricing`, lastModified: generatedAt, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/games`, lastModified: generatedAt, changeFrequency: "hourly", priority: 0.9 },
    { url: `${site.url}/trending`, lastModified: generatedAt, changeFrequency: "hourly", priority: 0.8 },
    { url: `${site.url}/trending/day`, lastModified: generatedAt, changeFrequency: "hourly", priority: 0.7 },
    { url: `${site.url}/trending/month`, lastModified: generatedAt, changeFrequency: "hourly", priority: 0.7 },
    // Platform statistics hub (authority / citation page).
    { url: `${site.url}/roblox-statistics`, lastModified: generatedAt, changeFrequency: "hourly", priority: 0.8 },
    // Cluster-A opportunity / money pages (highest commercial intent).
    { url: `${site.url}/best-roblox-games-to-make-2026`, lastModified: generatedAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/most-profitable-roblox-game-genres`, lastModified: generatedAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/rising-roblox-niches`, lastModified: generatedAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/what-roblox-game-should-i-make`, lastModified: generatedAt, changeFrequency: "daily", priority: 0.9 },
    // Cross-platform "replicate-this" radar hub.
    { url: `${site.url}/steam-games-to-clone-on-roblox`, lastModified: generatedAt, changeFrequency: "daily", priority: 0.9 },
    // Calculators (static, high-volume search intent).
    { url: `${site.url}/calculators/devex`, lastModified: generatedAt, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/calculators/revenue`, lastModified: generatedAt, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/about/methodology`, lastModified: generatedAt, changeFrequency: "monthly", priority: 0.5 },
    // Glossary / Q&A authority hub (evergreen).
    { url: `${site.url}/learn`, lastModified: generatedAt, changeFrequency: "monthly", priority: 0.6 },
    ...LEARN_ENTRIES.map((e) => ({
      url: `${site.url}/learn/${e.slug}`,
      lastModified: generatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  const genrePages: MetadataRoute.Sitemap = (genres?.genres ?? []).flatMap((g) => {
    const slug = toGenreSlug(g.genre);
    return [
      {
        url: `${site.url}/genre/${slug}`,
        lastModified: generatedAt,
        changeFrequency: "hourly" as const,
        priority: 0.7,
      },
      {
        url: `${site.url}/genre/${slug}/saturation`,
        lastModified: generatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      },
    ];
  });

  const topGames = (trending?.entries ?? [])
    .slice()
    .sort((a, b) => b.playing - a.playing)
    .slice(0, GAME_URL_CAP);

  const gamePages: MetadataRoute.Sitemap = topGames.map((e) => ({
    url: `${site.url}/game/${e.universeId}/${slugify(e.name)}`,
    lastModified: generatedAt,
    changeFrequency: "hourly" as const,
    priority: 0.6,
  }));

  // Per-game revenue pages ("how much money does <game> make").
  const revenuePages: MetadataRoute.Sitemap = topGames.map((e) => ({
    url: `${site.url}/game/${e.universeId}/${slugify(e.name)}/revenue`,
    lastModified: generatedAt,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // Per-game status pages ("is <game> dead / still popular").
  const statusPages: MetadataRoute.Sitemap = topGames.map((e) => ({
    url: `${site.url}/game/${e.universeId}/${slugify(e.name)}/status`,
    lastModified: generatedAt,
    changeFrequency: "hourly" as const,
    priority: 0.5,
  }));

  // Head-to-head comparison pages ("<game> vs <game>").
  const comparePages: MetadataRoute.Sitemap = (await topMatchups()).map(
    (matchup) => ({
      url: `${site.url}/compare/${matchup}`,
      lastModified: generatedAt,
      changeFrequency: "daily" as const,
      priority: 0.5,
    }),
  );

  // Programmatic "Roblox version of <X>" AEO pages, from the durable catalog.
  const robloxVersionPages: MetadataRoute.Sitemap = (steamCatalog?.entries ?? []).map((e) => ({
    url: `${site.url}/roblox-version-of/${e.slug}`,
    lastModified: generatedAt,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...genrePages,
    ...gamePages,
    ...revenuePages,
    ...statusPages,
    ...comparePages,
    ...robloxVersionPages,
  ];
}
