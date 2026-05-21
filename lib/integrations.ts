export type Integration = {
  name: string;
  slug: string;
  logo: string;
  installLabel: string;
  installSnippet: string;
};

export const integrations: Integration[] = [
  {
    name: "Claude Code",
    slug: "claude-code",
    logo: "/logos/claude-code.svg",
    installLabel: "Terminal",
    installSnippet: "claude mcp add bloxscout -- npx -y bloxscout-mcp",
  },
  {
    name: "Cursor",
    slug: "cursor",
    logo: "/logos/cursor.svg",
    installLabel: "~/.cursor/mcp.json",
    installSnippet: `{
  "mcpServers": {
    "bloxscout": {
      "command": "npx",
      "args": ["-y", "bloxscout-mcp"]
    }
  }
}`,
  },
  {
    name: "Windsurf",
    slug: "windsurf",
    logo: "/logos/windsurf.svg",
    installLabel: "~/.codeium/windsurf/mcp_config.json",
    installSnippet: `{
  "mcpServers": {
    "bloxscout": {
      "command": "npx",
      "args": ["-y", "bloxscout-mcp"]
    }
  }
}`,
  },
  {
    name: "Zed",
    slug: "zed",
    logo: "/logos/zed.svg",
    installLabel: "~/.config/zed/settings.json",
    installSnippet: `{
  "context_servers": {
    "bloxscout": {
      "command": {
        "path": "npx",
        "args": ["-y", "bloxscout-mcp"]
      }
    }
  }
}`,
  },
];
