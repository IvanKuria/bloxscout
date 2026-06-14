import type { MetadataRoute } from "next";
import { getFreshness, getGenres, getTrending } from "@/lib/data";
import { genreSlug as toGenreSlug, slugify } from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;

/** Cap game URLs to the most-played games to keep the sitemap focused. */
const GAME_URL_CAP = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { generatedAt } = await getFreshness();
  const [trending, genres] = await Promise.all([getTrending(), getGenres()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, lastModified: generatedAt, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/games`, lastModified: generatedAt, changeFrequency: "hourly", priority: 0.9 },
    { url: `${site.url}/about/methodology`, lastModified: generatedAt, changeFrequency: "monthly", priority: 0.5 },
  ];

  const genrePages: MetadataRoute.Sitemap = (genres?.genres ?? []).map((g) => ({
    url: `${site.url}/genre/${toGenreSlug(g.genre)}`,
    lastModified: generatedAt,
    changeFrequency: "hourly",
    priority: 0.7,
  }));

  const gamePages: MetadataRoute.Sitemap = (trending?.entries ?? [])
    .slice()
    .sort((a, b) => b.playing - a.playing)
    .slice(0, GAME_URL_CAP)
    .map((e) => ({
      url: `${site.url}/game/${e.universeId}/${slugify(e.name)}`,
      lastModified: generatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...genrePages, ...gamePages];
}
