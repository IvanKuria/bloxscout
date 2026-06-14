import {
  Compass,
  Radar,
  Rocket,
  Lightbulb,
  Activity,
  LineChart,
  type LucideIcon,
} from "lucide-react";

/** A thing you can ask the agent — phrased the way a developer would say it. */
export type Capability = {
  /** A real prompt a developer would type. */
  prompt: string;
  /** The shape of the answer the agent gives back. */
  answer: string;
};

export type CapabilityGroup = {
  slug:
    | "niches"
    | "saturation"
    | "breakouts"
    | "ideas"
    | "intelligence"
    | "trends";
  name: string;
  blurb: string;
  icon: LucideIcon;
  capabilities: Capability[];
};

export const capabilityGroups: CapabilityGroup[] = [
  {
    slug: "niches",
    name: "Find emergent niches",
    blurb:
      "Surface the niches gaining players before they're obvious — while there's still room to enter.",
    icon: Compass,
    capabilities: [
      {
        prompt: "What niches are heating up right now?",
        answer:
          "Ranked emergent niches with momentum and how crowded each one already is.",
      },
      {
        prompt: "Show me under-served corners of the simulator space.",
        answer:
          "Sub-niches with real player demand and few games competing for it.",
      },
    ],
  },
  {
    slug: "saturation",
    name: "Gauge a niche",
    blurb:
      "Ask whether any niche is saturated or still winnable — scored on live competition, not vibes.",
    icon: Radar,
    capabilities: [
      {
        prompt: "Is tower defense saturated?",
        answer:
          "A verdict (open / contested / locked), the top-game dominance, and whether there's white space to enter.",
      },
      {
        prompt: "Is anime fighting too crowded to break into?",
        answer:
          "Live cohort size, total demand, and how much of it the leaders already own.",
      },
    ],
  },
  {
    slug: "breakouts",
    name: "Spot breakout games",
    blurb:
      "Catch the games growing fastest right now — the ones defining what comes next.",
    icon: Rocket,
    capabilities: [
      {
        prompt: "Which games are breaking out this week?",
        answer:
          "Fastest-growing games by live player momentum, with the niche each one is pulling.",
      },
      {
        prompt: "What's gaining players faster than the genre around it?",
        answer:
          "Outliers beating their cohort's growth — early signal on where attention is moving.",
      },
    ],
  },
  {
    slug: "ideas",
    name: "Decide what to build",
    blurb:
      "Turn live market signal into a concrete answer to the only question that matters.",
    icon: Lightbulb,
    capabilities: [
      {
        prompt: "What should I build next?",
        answer:
          "Idea directions matched to demand you can realistically win, with the reasoning behind each.",
      },
      {
        prompt: "I'm a solo dev — where's my best shot?",
        answer:
          "Niches sized to a small team: real players, fragmented leaders, room to enter.",
      },
    ],
  },
  {
    slug: "intelligence",
    name: "Read any game or genre",
    blurb:
      "Pull live stats on a game, its cohort, and the creators winning a space.",
    icon: LineChart,
    capabilities: [
      {
        prompt: "How does this game compare to its genre?",
        answer:
          "Live CCU, visits and growth against the genre median and percentiles.",
      },
      {
        prompt: "Who are the top creators in RPG right now?",
        answer:
          "The studios winning a niche, ranked by the live performance of their games.",
      },
    ],
  },
  {
    slug: "trends",
    name: "Always-live data",
    blurb:
      "Every answer is grounded in live Roblox player data, refreshed every ~30 minutes.",
    icon: Activity,
    capabilities: [
      {
        prompt: "How many people are playing this right now?",
        answer:
          "Current concurrents and visits, timestamped — not a stale training-data guess.",
      },
      {
        prompt: "What's the trend over the last 7 days?",
        answer:
          "Recent momentum from continuously captured snapshots, so the trend is real.",
      },
    ],
  },
];

export const totalCapabilityCount = capabilityGroups.reduce(
  (acc, g) => acc + g.capabilities.length,
  0,
);
