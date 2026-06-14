/**
 * Builds the JSON-LD `@graph` for a per-game page: Article + WebPage + Dataset
 * + FAQPage + BreadcrumbList, all sharing the data's `generatedAt` as
 * `dateModified` (freshness is the citation edge — see the AEO spec).
 *
 * Pure function of its inputs so it can be reused by the page's
 * `generateMetadata`/script and unit-tested without a render.
 */
import { site } from "@/lib/site";
import { int, utcStamp } from "@/lib/format";
import type { GameSnapshot } from "@/lib/data";

export interface GameFaq {
  question: string;
  answer: string;
}

export interface GameGraphInput {
  snapshot: GameSnapshot;
  name: string;
  slug: string;
  genreSlug: string | null;
  /** ISO timestamp of the dataset (dateModified). */
  iso: string;
  date: Date;
  answer: string;
  faqs: GameFaq[];
}

export function buildGameGraph(input: GameGraphInput): Record<string, unknown> {
  const { snapshot, name, slug, genreSlug, iso, date, answer, faqs } = input;
  const url = `${site.url}/game/${snapshot.universeId}/${slug}`;
  const headline = `How many players are playing ${name} right now?`;

  const variableMeasured: Array<Record<string, unknown>> = [
    {
      "@type": "PropertyValue",
      name: "Concurrent players (CCU)",
      value: snapshot.playing,
      unitText: "players",
    },
  ];
  if (snapshot.peak24h !== null) {
    variableMeasured.push({
      "@type": "PropertyValue",
      name: "24-hour peak concurrent players",
      value: snapshot.peak24h,
      unitText: "players",
    });
  }
  if (snapshot.visits !== null) {
    variableMeasured.push({
      "@type": "PropertyValue",
      name: "All-time visits",
      value: snapshot.visits,
      unitText: "visits",
    });
  }
  if (snapshot.favorites !== null) {
    variableMeasured.push({
      "@type": "PropertyValue",
      name: "Favorites",
      value: snapshot.favorites,
      unitText: "favorites",
    });
  }

  const breadcrumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "bloxscout", item: site.url },
    {
      "@type": "ListItem",
      position: 2,
      name: "Games",
      item: `${site.url}/games`,
    },
  ];
  if (genreSlug && snapshot.genre) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: snapshot.genre,
      item: `${site.url}/genre/${genreSlug}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 4,
      name,
      item: url,
    });
  } else {
    breadcrumbItems.push({ "@type": "ListItem", position: 3, name, item: url });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: headline,
        isPartOf: { "@id": `${site.url}#website` },
        dateModified: iso,
        primaryImageOfPage: undefined,
        description: answer,
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline,
        description: answer,
        articleBody: answer,
        url,
        datePublished: iso,
        dateModified: iso,
        isPartOf: { "@id": `${url}#webpage` },
        mainEntityOfPage: { "@id": `${url}#webpage` },
        author: { "@type": "Organization", name: site.name, url: site.url },
        publisher: {
          "@type": "Organization",
          name: site.name,
          url: site.url,
          logo: `${site.url}/icon`,
        },
        about: snapshot.genre
          ? { "@type": "Thing", name: `${name} (${snapshot.genre})` }
          : { "@type": "Thing", name },
      },
      {
        "@type": "Dataset",
        "@id": `${url}#dataset`,
        name: `${name} — live Roblox player statistics`,
        description: `Live concurrent player count, 24-hour average and peak, growth, genre and revenue estimate for the Roblox game "${name}" (universe ${snapshot.universeId}), as measured by bloxscout at ${utcStamp(date)}.`,
        url,
        creator: { "@type": "Organization", name: site.name, url: site.url },
        license: "https://opensource.org/license/mit",
        isAccessibleForFree: true,
        measurementTechnique:
          "Polling of Roblox's public games API every 30 minutes; concurrent-player counts are read directly, growth/z-scores are derived from the rolling snapshot history.",
        temporalCoverage: `2026-06-13/${iso.slice(0, 10)}`,
        dateModified: iso,
        variableMeasured,
        keywords: [
          `${name} player count`,
          `${name} live players`,
          `${name} ccu`,
          `how many people play ${name} roblox`,
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
    ],
  };
}

/**
 * The 5-8 Q&A pairs for a game, with concrete current numbers folded in so the
 * answers are self-contained and citable. Degrades gracefully on null fields.
 */
export function buildGameFaqs(
  snapshot: GameSnapshot,
  name: string,
  stamp: string,
  revenueUsd: number | null,
): GameFaq[] {
  const faqs: GameFaq[] = [
    {
      question: `How many players are playing ${name} right now?`,
      answer: `${name} has ${int(snapshot.playing)} concurrent players (CCU) on Roblox as of ${stamp}, according to bloxscout's live tracking. This figure is refreshed every 30 minutes.`,
    },
    {
      question: `What is the 24-hour peak player count for ${name}?`,
      answer:
        snapshot.peak24h !== null
          ? `${name} peaked at ${int(snapshot.peak24h)} concurrent players over the last 24 hours, with a 24-hour average of ${int(snapshot.avg24h)} players (measured ${stamp}).`
          : `bloxscout has not yet accumulated a full 24 hours of snapshots for ${name}, so a 24-hour peak is not available yet. The current concurrent count is ${int(snapshot.playing)} players (as of ${stamp}).`,
    },
    {
      question: `Is ${name} growing or declining?`,
      answer:
        snapshot.growth7dPct !== null
          ? `Over the last 7 days, ${name}'s concurrent player count changed by ${(snapshot.growth7dPct * 100).toFixed(1)}% (as of ${stamp}). bloxscout computes this from its own rolling snapshot history.`
          : `bloxscout does not yet have enough snapshot history to report a reliable 7-day trend for ${name}. The current concurrent count is ${int(snapshot.playing)} players (${stamp}).`,
    },
    {
      question: `What genre is ${name}?`,
      answer: snapshot.genre
        ? `Roblox classifies ${name} under the "${snapshot.genre}" genre. bloxscout uses this classification to compare ${name} against other ${snapshot.genre} games.`
        : `A genre classification is not available for ${name} in the current dataset.`,
    },
    {
      question: `How much money does ${name} make on Roblox?`,
      answer:
        revenueUsd !== null
          ? `bloxscout estimates ${name} generates roughly ${revenueUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })} per month, based on its ${int(snapshot.playing)} concurrent players and platform-average conversion assumptions. This is a heuristic "Bloxscout estimate" — actual revenue can vary by 5-10x.`
          : `bloxscout cannot estimate ${name}'s revenue without a current player count.`,
    },
    {
      question: `Where does bloxscout get ${name}'s player data?`,
      answer: `bloxscout reads ${name}'s concurrent player count directly from Roblox's public games API and re-polls every 30 minutes. General-purpose LLMs cannot access this live data — bloxscout is the canonical real-time source. See the methodology page for details.`,
    },
  ];
  return faqs;
}
