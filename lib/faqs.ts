export type Faq = {
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    question: "What is bloxscout?",
    answer:
      "bloxscout is an open-source MCP server and CLI for Roblox developers. It exposes 18 tools across discovery, game intelligence, creator lookup, calculators, snapshots, and reports — all backed by Roblox's public endpoints and (optionally) Open Cloud. The primary user is an AI agent inside your editor; the CLI is a thin wrapper around the same core for shell scripts and one-offs.",
  },
  {
    question: "How do I install it?",
    answer:
      "If you use Claude Code, run `claude mcp add bloxscout -- npx -y bloxscout-mcp`. For Cursor, Windsurf, and Zed, drop a single JSON block into the editor's MCP config file. The CLI runs zero-install with `npx bloxscout <command>` or globally via `npm install -g bloxscout`.",
  },
  {
    question: "What is MCP, and why is bloxscout MCP-first?",
    answer:
      "Model Context Protocol is the open standard that lets AI agents call external tools through a stdio interface. Agents are the natural user for market reconnaissance — they can ask follow-up questions, combine tools, and surface insights without you leaving your editor. bloxscout exposes its full surface as MCP tools first; the CLI is the same engine wrapped in Commander.",
  },
  {
    question: "Which agents and editors does it work with?",
    answer:
      "Claude Code, Cursor, Windsurf, and Zed are first-class — each has a copy-pasteable config block. Any MCP-compliant client can launch `bloxscout-mcp` as a stdio server. The CLI runs anywhere Node.js 20+ is installed.",
  },
  {
    question: "Is bloxscout affiliated with Roblox or Rotrends?",
    answer:
      "No. bloxscout is an unofficial tool. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Super League Enterprise / Rotrends. Data is sourced from Roblox's public unauthenticated endpoints — `games.roblox.com`, `presence.roblox.com`, `groups.roblox.com`, `users.roblox.com`, and `thumbnails.roblox.com`.",
  },
  {
    question: "Is it free? What is the license?",
    answer:
      "Yes. bloxscout is free, open source, and MIT-licensed. Source lives on GitHub at IvanKuria/bloxscout. Contributions are welcome — start with the CONTRIBUTING.md and the `good first issue` label.",
  },
  {
    question: "How does the local snapshot store work?",
    answer:
      "Roblox does not expose historical time-series for CCU, visits, or likes. bloxscout's `snapshot_game` and `watch_games` tools persist point-in-time observations into a local SQLite database at `~/.bloxscout/data.db`. The `get_game_history` tool reads from that store, so the longer you run bloxscout, the richer your trend data becomes.",
  },
  {
    question: "Do I need a Roblox API key?",
    answer:
      "No, not for the default tools. bloxscout uses unauthenticated public Roblox endpoints. An Open Cloud key is only required if you want bloxscout to read data for games you own that is not exposed publicly.",
  },
];
