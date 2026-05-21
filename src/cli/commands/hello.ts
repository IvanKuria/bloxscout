import type { Command } from "commander";

/**
 * Stub `hello` command. Confirms the CLI scaffolding wires together end-to-end.
 * Real commands in Phase 3 should follow this register-on-program pattern.
 */
export function registerHelloCommand(program: Command): void {
  program
    .command("hello")
    .description("Print a friendly scaffolding banner")
    .action(() => {
      console.log("Bloxscout — Reconnaissance for Roblox devs. (CLI scaffolding in place.)");
    });
}
