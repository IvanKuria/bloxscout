import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Retrieval (answer-engine) bots are explicitly welcomed — bloxscout's whole
 * thesis is to be the cited real-time source. Training-only crawlers are
 * blocked: our data goes stale within 30 minutes so its training value is low,
 * and there's a competitive-leak risk in handing the full live dataset to a
 * model that won't cite us. See docs/v0.3/programmatic-seo-aeo-spec.md.
 */
export default function robots(): MetadataRoute.Robots {
  const retrievalBots = [
    "OAI-SearchBot",
    "PerplexityBot",
    "Claude-SearchBot",
    "ChatGPT-User",
    "Perplexity-User",
    "Claude-User",
  ];

  const trainingOnlyBots = [
    "GPTBot",
    "ClaudeBot",
    "anthropic-ai",
    "CCBot",
    "Google-Extended",
    "Bytespider",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...retrievalBots.map((userAgent) => ({ userAgent, allow: "/" })),
      ...trainingOnlyBots.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
