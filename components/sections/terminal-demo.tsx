"use client";

import Typewriter from "@/components/fancy/typewriter";

const lines = [
  "npx bloxscout trending --genre simulator --limit 5",
  "npx bloxscout compare 920587237 4974551500",
  "npx bloxscout devex 100000",
  "npx bloxscout report --genre rpg --limit 5",
  "npx bloxscout snapshot 920587237 --watch 300",
];

export function TerminalDemo() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-foreground/95 text-background shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-background/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
        <span className="ml-3 font-mono text-xs text-background/50">
          bloxscout — zsh
        </span>
      </div>
      <div className="px-5 py-6 font-mono text-sm leading-relaxed sm:text-[15px]">
        <div className="flex items-baseline gap-2">
          <span className="text-accent">~</span>
          <span className="text-background/60">$</span>
          <Typewriter
            as="span"
            text={lines}
            speed={45}
            waitTime={2200}
            deleteSpeed={20}
            className="text-background"
            cursorClassName="ml-0.5 text-accent"
            cursorChar="▍"
          />
        </div>
        <p className="mt-4 text-background/50">
          {"// 18 MCP tools. Pipeable. Agent-first. Zero install via npx."}
        </p>
      </div>
    </div>
  );
}
