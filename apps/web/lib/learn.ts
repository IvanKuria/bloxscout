/**
 * Content for the /learn glossary + Q&A authority hub.
 *
 * Evergreen, definitional content — the page type LLMs and answer engines quote
 * for "what is CCU / DevEx" and "how do Roblox games make money". Kept as plain
 * data (no IO) so the pages render fully static. Numbers that have a single
 * source of truth (the DevEx rate + payout minimum) are interpolated from
 * `@bloxscout/core/calculators` so this never drifts from the calculators.
 */
import {
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX as DEVEX_RATE,
  DEVEX_PAYOUT_MINIMUM_ROBUX as DEVEX_MIN,
} from "@bloxscout/core/calculators";

export type LearnType = "term" | "qa";

export interface LearnLink {
  href: string;
  label: string;
}

export interface LearnEntry {
  slug: string;
  type: LearnType;
  /** Short chip label for the index (the term, or a topic). */
  label: string;
  /** The H1 / title — phrased as the search query. */
  question: string;
  /** One-to-two sentence, self-contained answer (LLM-quotable; ~<=300 chars). */
  short: string;
  /** Body paragraphs, rendered as <p>. */
  body: string[];
  /** Outbound links to the live data pages. */
  related: LearnLink[];
  /** Other /learn slugs to cross-link. */
  seeAlso: string[];
}

const devexMin = DEVEX_MIN.toLocaleString("en-US");
const devexPer1k = `$${(DEVEX_RATE * 1000).toFixed(2)}`;

export const LEARN_ENTRIES: LearnEntry[] = [
  // ----- Glossary terms -----
  {
    slug: "ccu",
    type: "term",
    label: "CCU",
    question: "What is CCU on Roblox?",
    short:
      "CCU stands for concurrent users — the number of people in a game at the same moment. On Roblox it's the clearest live measure of how active and popular a game is right now.",
    body: [
      "Concurrent users (CCU), also called the live player count, counts everyone in a game's servers at a given instant. Unlike total visits — which only ever goes up — CCU rises and falls with the time of day, updates, and a game's momentum, so it reflects current demand rather than lifetime history.",
      "Because it moves in real time, CCU is the metric most analytics tools rank games by. bloxscout samples it every 30 minutes, so a game with a high, steady CCU has a durable audience, while a sudden CCU spike often signals a breakout.",
    ],
    related: [
      { href: "/games", label: "Top games by live CCU" },
      { href: "/trending", label: "Trending games right now" },
      { href: "/roblox-statistics", label: "Live Roblox statistics" },
    ],
    seeAlso: ["visits", "breakout-game", "what-is-a-good-ccu-for-a-roblox-game"],
  },
  {
    slug: "devex",
    type: "term",
    label: "DevEx",
    question: "What is DevEx on Roblox?",
    short: `DevEx (Developer Exchange) is Roblox's official program for converting earned Robux into real money, currently at ${devexPer1k} per 1,000 Robux. You need at least ${devexMin} earned Robux to cash out.`,
    body: [
      `Developer Exchange lets creators trade the Robux they've earned inside Roblox for US dollars. The current rate is $${DEVEX_RATE} per Robux (${devexPer1k} per 1,000 Robux). Only earned Robux — from game passes, developer products, and engagement payouts — qualifies; Robux you purchased can't be cashed out.`,
      `There's a ${devexMin}-Robux minimum before you can file a payout request, plus account and age requirements set by Roblox. Use the DevEx calculator to convert any Robux balance to USD at the live rate.`,
    ],
    related: [
      { href: "/calculators/devex", label: "DevEx calculator (Robux → USD)" },
      { href: "/calculators/revenue", label: "Game revenue calculator" },
    ],
    seeAlso: ["robux", "how-do-roblox-games-make-money"],
  },
  {
    slug: "robux",
    type: "term",
    label: "Robux",
    question: "What is Robux?",
    short:
      "Robux is Roblox's virtual currency. Players buy it with real money and spend it in games; developers earn it from those purchases and can convert it back to USD through DevEx.",
    body: [
      "Robux (R$) is the in-platform currency that powers Roblox's economy. Players acquire Robux with real money or a Premium subscription and spend it on game passes, items, and developer products inside experiences.",
      `When players spend Robux in your game, you earn a share of it. That earned Robux can be reinvested in advertising or cashed out to USD via Developer Exchange at $${DEVEX_RATE} per Robux. Roblox takes a platform cut before the developer's share, which is why estimated revenue and DevEx payouts are much smaller than gross Robux spent.`,
    ],
    related: [
      { href: "/calculators/devex", label: "Convert Robux to USD" },
      { href: "/most-profitable-roblox-game-genres", label: "Most profitable genres" },
    ],
    seeAlso: ["devex", "how-do-roblox-games-make-money"],
  },
  {
    slug: "visits",
    type: "term",
    label: "Visits",
    question: "What are visits on Roblox?",
    short:
      "Visits are the all-time total number of times a game has been entered. It's a lifetime, cumulative figure — useful for scale, but it never goes down and doesn't show current activity.",
    body: [
      "A visit is counted each time a player joins a game. The visit counter is cumulative across the game's entire life, so a high visit count signals long-term reach — but a game can have hundreds of millions of visits and very few players today.",
      "For how active a game is right now, concurrent players (CCU) is the better signal. bloxscout shows both: visits for lifetime scale, CCU and growth for current momentum.",
    ],
    related: [
      { href: "/games", label: "Games ranked by live players" },
      { href: "/trending", label: "Fastest-growing games" },
    ],
    seeAlso: ["ccu", "favorites"],
  },
  {
    slug: "favorites",
    type: "term",
    label: "Favorites",
    question: "What are favorites on Roblox?",
    short:
      "Favorites are the number of players who have bookmarked a game. Like visits, it's a lifetime, cumulative count — a rough proxy for a game's loyal-audience size.",
    body: [
      "When a player favorites a game it's added to their favorites list and they're more likely to return. The favorite count accumulates over a game's lifetime, so it loosely indicates how big and committed a game's fanbase is.",
      "Favorites are a lagging, lifetime signal — they don't show whether a game is growing or declining today. Pair them with CCU and 7-day growth to read current health.",
    ],
    related: [{ href: "/games", label: "Browse top games" }],
    seeAlso: ["visits", "ccu"],
  },
  {
    slug: "roblox-genre",
    type: "term",
    label: "Genre",
    question: "What is a Roblox genre?",
    short:
      "A genre is the category Roblox (and bloxscout) uses to group similar games — like Simulation, RPG, or Roleplay. Genres make it possible to compare a game against its real competitors and size a niche.",
    body: [
      "Every Roblox experience is classified into a genre such as Simulation, Adventure, RPG, Strategy, or Roleplay & Avatar Sim. Genres are how players discover similar games and how developers scope a market.",
      "bloxscout aggregates live data per genre: combined players, growth, saturation, and estimated revenue. That lets you ask whether a niche is crowded or wide open before you build in it.",
    ],
    related: [
      { href: "/roblox-statistics", label: "Roblox players by genre" },
      { href: "/most-profitable-roblox-game-genres", label: "Most profitable genres" },
      { href: "/rising-roblox-niches", label: "Rising niches" },
    ],
    seeAlso: ["genre-saturation", "how-to-find-a-roblox-game-idea"],
  },
  {
    slug: "breakout-game",
    type: "term",
    label: "Breakout",
    question: "What is a breakout game on Roblox?",
    short:
      "A breakout is a game whose live player count has jumped far above its own recent norm — a statistically unusual spike that often marks a game going viral.",
    body: [
      "bloxscout flags breakouts using a z-score: it compares a game's current 24-hour activity against its own prior week and measures how many standard deviations above normal it is. A high positive z-score means the game is suddenly far busier than usual.",
      "Breakouts are an early-warning signal for momentum — catching a game on the way up, before it's an obvious incumbent. They're surfaced on the trending board alongside raw growth.",
    ],
    related: [
      { href: "/trending", label: "Trending & breakout games" },
      { href: "/rising-roblox-niches", label: "Rising niches" },
    ],
    seeAlso: ["ccu", "genre-saturation"],
  },
  {
    slug: "genre-saturation",
    type: "term",
    label: "Saturation",
    question: "What is genre saturation on Roblox?",
    short:
      "Saturation measures how crowded and locked-up a genre is. A saturated genre is dominated by entrenched incumbents; a low-saturation 'white space' genre still has room for a new game to win.",
    body: [
      "bloxscout scores each genre's saturation from how concentrated its players are (do a few games hold most of the audience?), how intense the competition is, and how fresh the leaders are. A high score means newcomers face dominant incumbents.",
      "Low-saturation genres that are also growing are the sweet spot for a new game — enough demand to matter, not yet locked up. Those show up as 'white space' on bloxscout's saturation and rising-niche views.",
    ],
    related: [
      { href: "/rising-roblox-niches", label: "Rising, winnable niches" },
      { href: "/best-roblox-games-to-make-2026", label: "Best games to make" },
    ],
    seeAlso: ["roblox-genre", "how-to-find-a-roblox-game-idea", "breakout-game"],
  },

  // ----- Q&A explainers -----
  {
    slug: "how-do-roblox-games-make-money",
    type: "qa",
    label: "How games earn",
    question: "How do Roblox games make money?",
    short:
      "Roblox games earn Robux from in-experience purchases — game passes, developer products, and premium engagement payouts — which developers then convert to USD through DevEx.",
    body: [
      "The main revenue sources are game passes (one-time perks), developer products (consumables players rebuy), and Premium Payouts (Roblox pays creators based on how long Premium subscribers engage). Some games also earn from immersive ads.",
      `All of these pay out in Robux. Roblox keeps a platform share, and the developer's portion of earned Robux can be cashed out via Developer Exchange at $${DEVEX_RATE} per Robux. That platform cut is why a game's real take-home is far below the gross Robux players spend.`,
      "Because earnings scale with active players, a game's live CCU is the best free proxy for its revenue — which is exactly what bloxscout's revenue estimates are built on.",
    ],
    related: [
      { href: "/calculators/revenue", label: "Estimate a game's revenue" },
      { href: "/most-profitable-roblox-game-genres", label: "Most profitable genres" },
      { href: "/calculators/devex", label: "Robux → USD calculator" },
    ],
    seeAlso: ["devex", "robux", "how-much-does-the-average-roblox-game-make"],
  },
  {
    slug: "how-much-does-the-average-roblox-game-make",
    type: "qa",
    label: "Average earnings",
    question: "How much does the average Roblox game make?",
    short:
      "There's no meaningful 'average' — Roblox earnings are extremely top-heavy. The vast majority of games make little to nothing, while a small number of hits earn millions of dollars a year.",
    body: [
      "Game revenue on Roblox follows a power-law: a handful of breakout titles capture most of the spending, and the long tail earns very little. Quoting a simple mean is misleading because those few giants drag it far above what a typical game makes.",
      "A more useful question is what a game at a given size earns. As a rough rule of thumb, revenue scales with concurrent players, so bloxscout estimates earnings per game from live CCU and platform-average monetization — useful for order-of-magnitude direction, not accounting.",
      "To ground it in real numbers, look up any game's estimate or compare genres, where you can see both the total addressable revenue and the median per-game figure.",
    ],
    related: [
      { href: "/calculators/revenue", label: "Revenue calculator" },
      { href: "/most-profitable-roblox-game-genres", label: "Revenue by genre (total & median)" },
      { href: "/roblox-statistics", label: "Live Roblox statistics" },
    ],
    seeAlso: ["how-do-roblox-games-make-money", "devex"],
  },
  {
    slug: "what-is-a-good-ccu-for-a-roblox-game",
    type: "qa",
    label: "Good CCU",
    question: "What is a good CCU for a Roblox game?",
    short:
      "It's relative to the genre and your goals: a few hundred concurrent players is a real, monetizable audience; a few thousand puts you among the top games in most niches; the platform's giants run in the hundreds of thousands.",
    body: [
      "There's no universal threshold — 'good' depends on what a game is competing against. In a small or emerging niche, a few hundred steady concurrent players can be a leader; in a crowded genre the bar is far higher. The honest benchmark is the median game in your specific genre, not a platform-wide number.",
      "As a rough ladder: under ~50 CCU a game is barely active; a few hundred is a viable, earning audience; a few thousand is a strong performer in most genres; tens of thousands and up is hit territory. Compare your game against its genre cohort to see where it really stands.",
    ],
    related: [
      { href: "/roblox-statistics", label: "Players by genre" },
      { href: "/trending", label: "What's growing now" },
    ],
    seeAlso: ["ccu", "roblox-genre", "genre-saturation"],
  },
  {
    slug: "how-to-find-a-roblox-game-idea",
    type: "qa",
    label: "Finding an idea",
    question: "How do you find a good Roblox game idea?",
    short:
      "Look for a niche that's growing but not yet locked up — rising demand plus low saturation. That 'white space' is where a new game can still capture an audience instead of fighting entrenched incumbents.",
    body: [
      "The data-driven approach is to separate two signals: momentum (is the niche growing?) and saturation (is it already dominated by a few giants?). The best opportunities score high on the first and low on the second — genuine demand with room for a newcomer.",
      "bloxscout turns this into ranked lists: rising niches surfaces growing genres, the saturation views flag white space, and the opportunity pages combine both into concrete 'what to build' suggestions, refreshed from live data.",
    ],
    related: [
      { href: "/what-roblox-game-should-i-make", label: "What game should I make?" },
      { href: "/rising-roblox-niches", label: "Rising niches" },
      { href: "/best-roblox-games-to-make-2026", label: "Best games to make in 2026" },
    ],
    seeAlso: ["genre-saturation", "roblox-genre"],
  },
  {
    slug: "rotrends-api",
    type: "qa",
    label: "Rotrends API",
    question: "Does Rotrends have an API?",
    short:
      "No — Rotrends doesn't offer a public or developer API. It's a web dashboard plus a Discord bot for Roblox stats, with no documented endpoints to pull data programmatically. To get Roblox trend and game data in a queryable form, use bloxscout's live pages and AI copilot instead.",
    body: [
      "Rotrends is a website for browsing Roblox trends, keywords, and game stats, alongside a Discord bot that surfaces those stats in a server. There's no public API, developer docs, or supported endpoint to call its data from your own code. People assume an API exists because the numbers look structured — but there's no official way to pull them out.",
      "Most people searching for a \"Rotrends API\" actually want one thing: to pull Roblox trend, CCU, and game data into their own tool, bot, or spreadsheet. The reality is that no off-platform Roblox-analytics site publishes a documented public API. The underlying numbers all come from Roblox's own web endpoints, which is what tools like this sit on top of and re-present.",
      "If you need that data in a queryable form, bloxscout is the closest thing without writing API calls. The live pages — trending, top games, and per-genre views — are the structured data itself, refreshed continuously. And the AI copilot answers questions about it in plain English (\"which simulation games broke out this week?\"), which is effectively querying the dataset without an endpoint.",
    ],
    related: [
      { href: "/trending", label: "Roblox trends & breakouts (live)" },
      { href: "/", label: "bloxscout — Roblox data + AI copilot" },
      { href: "/games", label: "Top games by live players" },
    ],
    seeAlso: ["breakout-game", "ccu", "how-to-find-a-roblox-game-idea"],
  },
];

const BY_SLUG = new Map(LEARN_ENTRIES.map((e) => [e.slug, e]));

export function getLearnEntry(slug: string): LearnEntry | null {
  return BY_SLUG.get(slug) ?? null;
}
