import { AgentDemo } from "./agent-demo";

/**
 * Framed section for the scripted agent demo. Editorial copy on the left, the
 * replayed answer panel on the right.
 */
export function AgentDemoSection() {
  return (
    <section
      id="demo"
      className="scroll-mt-16 border-b border-border bg-secondary/40"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
        <div className="lg:max-w-md">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-accent uppercase">
            <span className="h-px w-6 bg-accent" aria-hidden />
            Watch it think
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.01em] text-foreground sm:text-[40px] sm:leading-[1.05]">
            Ask a real question. Get a verdict.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            This is an actual bloxscout exchange, replayed. You ask whether a
            niche is saturated; the agent scans the live cohort, sizes the
            demand, and tells you — in plain language — whether there&apos;s room
            to win.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-foreground/85">
            {[
              "Reads the live cohort, not stale training data",
              "Scores who owns the niche and how much white space is left",
              "Lands on a decision you can act on today",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span className="mt-0.5 select-none font-mono text-accent">
                  ›
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
    </section>
  );
}
