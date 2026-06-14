import Link from "next/link";
import { ArrowRight } from "lucide-react";
import VerticalCutReveal from "@/components/fancy/vertical-cut-reveal";
import { AgentDemo } from "./agent-demo";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* airy gradient wash + faint grid, kept entirely light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_-10%,rgba(226,35,26,0.05),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(10,10,10,0.035),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(10,10,10,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.025)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(100%_70%_at_30%_0%,black,transparent_75%)]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-6 pt-20 pb-24 sm:pt-24 sm:pb-28 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pt-28">
        <div className="lg:max-w-xl">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            <span className="recon-pulse h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            AI agent for Roblox developers
          </p>

          <h1 className="font-heading text-[40px] leading-[1.02] font-semibold tracking-[-0.02em] text-foreground sm:text-[54px] lg:text-[60px]">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.045}
              staggerFrom="first"
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              containerClassName="block"
            >
              Find winning Roblox ideas
            </VerticalCutReveal>
            <span className="mt-1 block text-accent">
              <VerticalCutReveal
                splitBy="words"
                staggerDuration={0.045}
                staggerFrom="first"
                transition={{ type: "spring", stiffness: 200, damping: 24, delay: 0.32 }}
                containerClassName="block"
              >
                before everyone else.
              </VerticalCutReveal>
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            bloxscout is the AI agent that scouts the Roblox economy for emergent
            niches and winning game ideas. Ask what to build, whether a niche is
            still winnable, and which games are breaking out — grounded in live
            data, not guesswork.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-[0_10px_24px_-12px_rgba(226,35,26,0.7)] transition-colors hover:bg-accent-hover"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-5 font-mono text-xs text-muted-foreground">
            Nothing to install · live Roblox data, refreshed every ~30 min
          </p>
        </div>

        <div className="lg:pl-2">
          <AgentDemo />
        </div>
      </div>
    </section>
  );
}
