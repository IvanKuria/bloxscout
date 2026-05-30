# bloxscout-mcp

MCP server for [bloxscout](https://github.com/IvanKuria/bloxscout) — live Roblox analytics for AI agents.

This is a thin launcher package that re-exports the MCP entrypoint from `bloxscout`. It exists so the install command works cleanly with `npx`:

```sh
claude mcp add bloxscout -- npx -y bloxscout-mcp
```

For the full project, CLI, source code, and docs, see the main repo: https://github.com/IvanKuria/bloxscout
