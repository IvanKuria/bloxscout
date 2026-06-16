import { Check } from "lucide-react";
import { AgentDemo } from "./agent-demo";
import { Section, Eyebrow } from "./section";

/**
 * Framed section for the scripted agent demo. Editorial copy on the left, the
 * replayed answer panel on the right. Light scheme keeps the replayed product
 * panel reading as the real interface.
 */
export function AgentDemoSection() {
  return (
    <Section tone="plain" id="demo" innerClassName="py-24 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div className="lg:max-w-md">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
            Ask a real question. Get a verdict.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-[1.6] text-muted-foreground">
            Real bloxscout exchanges, replayed. Ask what a game earns, who it
            competes with, or whether a niche is saturated — the agent reads the
            live data and answers in plain language, with the same interactive
            widgets you get in the product.
          </p>
          <ul className="mt-7 space-y-3 border-t border-border pt-6 text-[14px] text-foreground/80">
            {[
              "Estimates revenue, maps competitors, scores saturation — and more",
              "Reads live Roblox data, not stale training data",
              "Lands on a decision you can act on today",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-foreground"
                  strokeWidth={2.2}
                  aria-hidden
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pl-2">
          <AgentDemo />
        </div>
      </div>
    </Section>
  );
}
