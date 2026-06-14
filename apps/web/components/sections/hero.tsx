import VerticalCutReveal from "@/components/fancy/vertical-cut-reveal";
import { InstallPill } from "./install-pill";
import { TerminalDemo } from "./terminal-demo";
import { site } from "@/lib/site";
import { totalToolCount } from "@/lib/tools";

export function Hero() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:flex-row lg:items-center lg:gap-16 lg:pt-32">
        <div className="flex-1 lg:max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-mono text-xs tracking-tight text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            MCP server + CLI · {totalToolCount} tools · MIT
          </p>

          <h1 className="text-[44px] leading-[1.05] font-medium tracking-[-0.02em] text-foreground sm:text-[56px] lg:text-[64px]">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.05}
              staggerFrom="first"
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              containerClassName="block"
            >
              {site.tagline}
            </VerticalCutReveal>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Roblox developers run one of the largest game platforms on the
            internet — without an API for the market data they need. bloxscout
            closes that gap. Ask your agent. Read the answer. Stay in your
            editor.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <InstallPill command={site.installCommand} />
            <a
              href="#tools"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              See the {totalToolCount} tools →
            </a>
          </div>

          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Works in Claude Code, Cursor, Windsurf, and Zed.
          </p>
        </div>

        <div className="flex-1 lg:max-w-xl">
          <TerminalDemo />
        </div>
      </div>
    </section>
  );
}
