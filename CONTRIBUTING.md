# Contributing to bloxscout

Thanks for your interest in helping out. This guide covers local setup, branch conventions, commit style, and how to propose new MCP tools.

## Local setup

Prerequisites: Node.js 20+ and [pnpm](https://pnpm.io/).

```sh
pnpm i           # install dependencies
pnpm dev         # run the CLI / MCP server in watch mode
pnpm test        # run the test suite (vitest)
pnpm lint        # run biome lint + format check
```

## Branch naming

Use the following prefixes:

- `feat/<slug>` — new features
- `fix/<slug>` — bug fixes
- `docs/<slug>` — documentation only
- `chore/<slug>` — tooling, deps, refactors with no user-facing change

Example: `feat/discover-underserved-genres`.

## Commit messages

Bloxscout uses [Conventional Commits](https://www.conventionalcommits.org/). Examples:

```
feat(mcp): add discover_underserved_genres tool
fix(cli): handle empty genre filter in trending command
docs(readme): clarify Open Cloud requirements
chore(deps): bump zod to 3.23
```

Commit messages drive the changelog and release notes, so be precise.

## Pull request workflow

All changes go through the `gh` CLI workflow: open an issue, branch from `main`, push, open a PR, get review, merge.

```sh
gh issue create --title "..." --body "..."
git checkout -b feat/my-thing
# ... make changes ...
git push -u origin feat/my-thing
gh pr create --fill
```

### PR checklist

Every PR should:

- [ ] Link the issue it closes (`Closes #123`)
- [ ] Add or update tests for changed behavior
- [ ] Update docs (README, tool reference, examples) if user-facing
- [ ] Add a changelog entry under `## [Unreleased]` in `CHANGELOG.md`
- [ ] Call out breaking changes explicitly in the PR body

## Proposing a new MCP tool

New MCP tools are the highest-leverage contributions. Before writing code, open an issue using the **New MCP tool proposal** template. The template forces you to specify the tool name, inputs, outputs, an example agent prompt, the Roblox data sources required, and the user benefit. A maintainer will sign off on the design before implementation begins.

Once approved:

1. Implement the tool's core logic in `src/core/`.
2. Register the MCP tool in `src/mcp/tools/`.
3. Add a thin CLI subcommand in `src/cli/commands/` if appropriate.
4. Add unit + integration tests.
5. Document the tool in the README tool table and update the changelog.

## Questions

For general questions, use [GitHub Discussions](https://github.com/IvanKuria/bloxscout/discussions). For security issues, see [SECURITY.md](./SECURITY.md).
