export type Faq = {
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    question: "What is bloxscout?",
    answer:
      "bloxscout is an AI agent built for Roblox developers. You ask it questions in plain language (what to build, whether a niche is saturated, which games are breaking out) and it answers using live data from the Roblox economy. Think of it as a market analyst that has read every game's live numbers and is always up to date.",
  },
  {
    question: "What can I actually ask it?",
    answer:
      'Anything about the Roblox market. "Is tower defense saturated?", "What niches are heating up?", "Which games are breaking out this week?", "I\'m a solo dev, what should I build?". The agent finds the matching games live, measures real competition and momentum, and answers with the reasoning so you can act on it.',
  },
  {
    question: "Where does the data come from?",
    answer:
      "Live Roblox player data: concurrent players, visits, favorites, growth and genre signal, refreshed roughly every 30 minutes. Because the agent reads current numbers instead of relying on stale training data, it can answer questions a general-purpose chatbot simply can't: who's playing what right now, and where attention is moving today.",
  },
  {
    question: "How is this different from asking ChatGPT or a dashboard?",
    answer:
      "A general chatbot guesses from old training data and has no idea what's trending today. A dashboard shows you numbers but leaves the analysis to you. bloxscout does both: it pulls the live numbers and reasons over them, sizing demand, scoring saturation, and pointing at the white space, so you get a decision, not a chart to interpret.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create a free account and start asking the agent. There's nothing to install and no setup. Sign in, type your first question, and you'll have a grounded answer in seconds.",
  },
  {
    question: "Is bloxscout affiliated with Roblox?",
    answer:
      "No. bloxscout is an independent tool and is not affiliated with, endorsed by, or sponsored by Roblox Corporation. It reads from Roblox's public player data to ground its answers.",
  },
];
