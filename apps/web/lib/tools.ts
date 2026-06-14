import {
  Compass,
  BarChart3,
  Users,
  Calculator,
  Camera,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  name: string;
  description: string;
};

export type ToolCategory = {
  slug:
    | "discovery"
    | "intelligence"
    | "creator"
    | "calculators"
    | "operational"
    | "reports";
  name: string;
  blurb: string;
  icon: LucideIcon;
  tools: Tool[];
};

export const toolCategories: ToolCategory[] = [
  {
    slug: "discovery",
    name: "Discovery",
    blurb: "Find what is trending, growing, or under-served on Roblox.",
    icon: Compass,
    tools: [
      {
        name: "search_games",
        description:
          "Search Roblox's catalog by keyword with optional genre and sort filters.",
      },
      {
        name: "get_trending_games",
        description:
          "Return games trending now, optionally filtered by genre.",
      },
      {
        name: "get_top_by_genre",
        description:
          "List the top games within a specific genre ranked by CCU or visits.",
      },
      {
        name: "get_up_and_coming",
        description:
          "Surface smaller games with unusually strong recent growth.",
      },
      {
        name: "discover_underserved_genres",
        description:
          "Identify genres with high player demand and low developer supply.",
      },
    ],
  },
  {
    slug: "intelligence",
    name: "Game Intelligence",
    blurb: "Deep stats on a game, its history, and its cohort.",
    icon: BarChart3,
    tools: [
      {
        name: "get_game",
        description:
          "Fetch a single game's full metadata: name, description, creator, stats, thumbnails.",
      },
      {
        name: "get_game_player_count",
        description:
          "Return current CCU and total visits for a given universe ID.",
      },
      {
        name: "get_game_history",
        description:
          "Read locally-stored historical snapshots for a game's CCU, visits, and likes.",
      },
      {
        name: "compare_games",
        description:
          "Side-by-side comparison of up to N games on the same metrics.",
      },
      {
        name: "analyze_game_vs_genre",
        description:
          "Compare one game against the median or percentile of its genre cohort.",
      },
    ],
  },
  {
    slug: "creator",
    name: "Creator & Community",
    blurb: "Look up creators, groups, and the people behind the games.",
    icon: Users,
    tools: [
      {
        name: "get_creator",
        description:
          "Look up a user or group creator with bio, follower count, and verification status.",
      },
      {
        name: "get_group",
        description:
          "Fetch a group's metadata, member count, and recent activity.",
      },
      {
        name: "get_top_creators_by_genre",
        description:
          "Identify the most successful creators within a specific genre.",
      },
    ],
  },
  {
    slug: "calculators",
    name: "Calculators",
    blurb: "Robux-to-USD math and revenue estimates without the spreadsheet.",
    icon: Calculator,
    tools: [
      {
        name: "calculate_devex",
        description: "Convert Robux to USD via the current DevEx rate.",
      },
      {
        name: "estimate_game_revenue",
        description:
          "Estimate gross Robux revenue from visits, CCU, and monetization assumptions.",
      },
    ],
  },
  {
    slug: "operational",
    name: "Operational",
    blurb:
      "Build your own historical record. Roblox does not expose time-series — you do.",
    icon: Camera,
    tools: [
      {
        name: "snapshot_game",
        description:
          "Capture a point-in-time snapshot of a game into the local SQLite store.",
      },
      {
        name: "watch_games",
        description:
          "Schedule recurring snapshots for a set of games to build time-series.",
      },
    ],
  },
  {
    slug: "reports",
    name: "Reports",
    blurb: "Structured Markdown and JSON reports your agent can act on.",
    icon: FileText,
    tools: [
      {
        name: "generate_market_report",
        description:
          "Produce a structured market report (Markdown and JSON) for a genre or watchlist.",
      },
    ],
  },
];

export const totalToolCount = toolCategories.reduce(
  (acc, c) => acc + c.tools.length,
  0,
);
