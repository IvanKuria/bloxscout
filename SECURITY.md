# Security Policy

## Supported versions

Bloxscout is in early development. Only the latest published version is supported with security fixes.

| Version | Supported |
| --- | --- |
| latest (`main`) | yes |
| anything older | no |

## Reporting a vulnerability

**Please do not open a public issue for security reports.**

Preferred channel — use GitHub's private security advisory flow:

1. Go to https://github.com/IvanKuria/bloxscout/security/advisories/new
2. Fill in the report. Include reproduction steps, affected versions, and any proof-of-concept.

If you cannot use the GitHub flow, email **ivankuria7@gmail.com** with the subject line `bloxscout security: <short summary>`.

## What to expect

- **Acknowledgement** within 5 business days of receipt.
- **Triage + severity assessment** within 10 business days.
- **Fix or mitigation plan** within 30 days for high-severity issues. Lower-severity issues are addressed on a best-effort basis.
- **Coordinated disclosure** — once a fix is available, the advisory is published with credit to the reporter (unless anonymity is requested).

This is a maintainer-best-effort open-source project, not a commercial offering. Response times are aspirational, not contractual.

## Scope

In scope:

- Vulnerabilities in the published `bloxscout` npm package (CLI binary or MCP server).
- Credential or token leakage caused by Bloxscout's handling of Roblox Open Cloud API keys.
- Code-execution paths triggered by malicious MCP tool inputs.

Out of scope:

- Roblox platform issues. Report those to Roblox via https://www.roblox.com/info/security.
- Vulnerabilities in third-party dependencies — please file those upstream. We do monitor Dependabot alerts and ship fixes promptly.
- Rate-limit avoidance, scraping disputes, or terms-of-service questions involving third-party sites.

Thank you for helping keep Bloxscout and its users safe.
