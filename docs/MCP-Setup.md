# MCP Setup

Bloxscout ships a stdio MCP server as the `bloxscout-mcp` binary. This page
covers integration with the four clients we test against and the gotchas to
watch for.

## Choosing an MCP client

| Client | Best for | Notes |
| --- | --- | --- |
| **Claude Code** | Terminal-first developers; long agentic loops over a repo. | One-line `claude mcp add` registration; per-project or global scope. |
| **Cursor** | IDE users who want chat next to code with a familiar VS Code UI. | Single JSON file (`~/.cursor/mcp.json`) lists every server. |
| **Windsurf** | Codeium users who already have the Cascade agent. | Same JSON shape as Cursor under `~/.codeium/windsurf/`. |
| **Zed** | Performance-minded users on the Zed editor. | Uses `context_servers` (not `mcpServers`) in `settings.json`. |

Bloxscout's server has no required configuration — the same command works in
every client.

## Claude Code

```sh
claude mcp add bloxscout -- npx -y bloxscout-mcp
```

The registration is written to Claude Code's MCP config. To verify, run
`claude mcp list` and look for `bloxscout`. Inside a session, ask the agent
"what bloxscout tools are available?" — it should enumerate the
[18 tools](./Tools-Reference.md).

## Cursor

Edit `~/.cursor/mcp.json` and add:

```json
{
  "mcpServers": {
    "bloxscout": {
      "command": "npx",
      "args": ["-y", "bloxscout-mcp"]
    }
  }
}
```

Restart Cursor. Open the Settings → MCP panel; `bloxscout` should show a green
"connected" status. Tools become available to the Composer/Agent automatically.

## Windsurf

Edit `~/.codeium/windsurf/mcp_config.json` (create it if missing):

```json
{
  "mcpServers": {
    "bloxscout": {
      "command": "npx",
      "args": ["-y", "bloxscout-mcp"]
    }
  }
}
```

Reload Windsurf. Cascade lists registered MCP servers in its tool picker.

## Zed

Edit `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "bloxscout": {
      "command": {
        "path": "npx",
        "args": ["-y", "bloxscout-mcp"]
      }
    }
  }
}
```

Note the different top-level key (`context_servers`, not `mcpServers`) and the
nested `command` object — this is Zed's schema, not the standard one.

## Verifying the server independently

You can run the server by hand to confirm it starts:

```sh
npx -y bloxscout-mcp
```

It will block waiting on stdio. Press Ctrl-C to exit. If you see a Node version
error or the binary cannot be found, see [Common gotchas](#common-gotchas).

## Common gotchas

**`npx: command not found`.** Install Node 20+ from
[nodejs.org](https://nodejs.org/) or via your platform's package manager.
`npx` ships with `npm`.

**`Error: Unsupported engine`.** Bloxscout requires Node 20+. Check
`node --version`. On macOS with multiple Node versions, your shell may pick a
different one than your editor — verify with `which node` inside the same
terminal your editor spawns subprocesses from.

**npx caches an old version.** `npx` caches packages aggressively. If you
recently upgraded and a fix is missing, clear the cache:

```sh
npx clear-npx-cache  # or: rm -rf ~/.npm/_npx
```

Or pin a version explicitly: `npx -y bloxscout-mcp@latest`.

**Agent does not see Bloxscout's tools.** Most MCP clients require a full
restart (not just a reload) after editing the config file. After restarting,
ask the agent to list tools.

**Corporate proxy / offline machine.** `npx` needs network access to the
public npm registry on first run. If you're behind a proxy, configure `npm`
with `npm config set proxy http://...` before invoking `npx`.

**PATH issues inside editors.** GUI applications launched from the Dock or
Start menu often have a minimal `PATH` that doesn't include user-installed
Node. If `npx` is found in your terminal but not in the editor, install Node
system-wide or launch the editor from your shell.

## Next

- [Tools Reference](./Tools-Reference.md) — what each tool does and what to ask
  your agent to invoke it.
- [Roblox Data Sources](./Roblox-Data-Sources.md) — what data Bloxscout fetches
  and how aggressively it caches.
