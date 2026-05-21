import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const llmBots = [
    "GPTBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
    "Applebot-Extended",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      ...llmBots.map((userAgent) => ({
        userAgent,
        allow: "/",
      })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
