export const site = {
  name: "bloxscout",
  domain: "bloxscout.ai",
  url: "https://bloxscout.ai",
  tagline: "Reconnaissance for Roblox game devs and their agents.",
  description:
    "bloxscout is an MCP server and CLI for Roblox developers. 18 tools for game discovery, market intelligence, creator lookup, DevEx and revenue calculations, snapshots, and reports — usable from Claude Code, Cursor, Windsurf, and Zed, or directly from your terminal.",
  installCommand: "claude mcp add bloxscout -- npx -y bloxscout-mcp",
  github: "https://github.com/IvanKuria/bloxscout",
  npm: "https://www.npmjs.com/package/bloxscout",
  license: "MIT",
  author: "Ivan Kuria",
} as const;
