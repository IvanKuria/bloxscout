import { AgentDemo } from "./agent-demo";
import { Section, Eyebrow } from "./section";

/**
 * Framed section for the scripted agent demo. Editorial copy on the left, the
 * replayed answer panel on the right. Light scheme keeps the replayed product
 * panel reading as the real interface.
 */
export function AgentDemoSection() {
  return (
    <Section scheme="light" id="demo" innerClassName="py-24 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div className="lg:max-w-md">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-5 text-[2rem] leading-[1.08] font-light tracking-[-0.04em] text-foreground sm:text-[2.6rem]">
            Ask a real question. Get a verdict.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-[1.6] text-foreground/60">
            An actual bloxscout exchange, replayed. You ask whether a niche is
            saturated; the agent scans the live cohort, sizes the demand, and
            tells you, in plain language, whether there&apos;s room to win.
          </p>
          <ul className="mt-7 space-y-3 border-t border-foreground/10 pt-6 text-[14px] text-foreground/75">
            {[
              "Reads the live cohort, not stale training data",
              "Scores who owns the niche and how much white space is left",
              "Lands on a decision you can act on today",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span className="mt-px select-none font-mono text-foreground/30">
                  →
                </span>
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
