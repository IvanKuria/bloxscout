import { Quote } from "lucide-react";

/**
 * Sample insight — a static, editorial recreation of a full agent answer to a
 * "what should I build?" style question. Showcases the agent's voice: it reasons
 * over live numbers and lands on a concrete, defensible recommendation.
 */

const SIGNALS = [
  { label: "Cohort", value: "30 live games" },
  { label: "Total demand", value: "274k CCU" },
  { label: "Leader share", value: "44%" },
  { label: "Verdict", value: "Contested" },
];

export function SampleInsight() {
  return (
    <section
      id="sample"
      className="scroll-mt-16 border-b border-border bg-background"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-accent uppercase">
            <span className="h-px w-6 bg-accent" aria-hidden />
            A real answer
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.01em] text-foreground sm:text-[40px] sm:leading-[1.05]">
            Not a dashboard. A point of view.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr] lg:gap-10">
          {/* The question + the signals it read */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-secondary/50 p-6">
              <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                you asked
              </p>
              <p className="font-heading text-xl leading-snug font-medium text-foreground">
                &ldquo;Is tower defense saturated, or is there still room for a
                solo dev?&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border">
              {SIGNALS.map((s) => (
                <div key={s.label} className="bg-background p-5">
                  <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                    {s.label}
                  </p>
                  <p className="tabular mt-1.5 font-heading text-2xl font-semibold text-foreground">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* The agent's reasoned answer */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 ring-1 ring-foreground/[0.04] sm:p-9">
            <Quote
              className="absolute -top-2 -left-1 h-20 w-20 text-accent/8"
              strokeWidth={1}
              aria-hidden
            />
            <p className="mb-5 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-accent uppercase">
              bloxscout agent
            </p>
            <div className="relative space-y-4 text-[15px] leading-relaxed text-foreground/90">
              <p>
                Tower defense is{" "}
                <strong className="font-semibold text-foreground">
                  contested, not locked
                </strong>
                . Thirty live games share 274k players, but Tower Defense
                Simulator alone holds 44% of them — one incumbent, deeply
                entrenched.
              </p>
              <p>
                The opening is in the tail. Nine smaller titles still pull real
                concurrents, which means players are actively shopping the niche
                rather than defaulting to the leader. That fragmentation is your
                white space.
              </p>
              <p className="border-l-2 border-accent pl-4 text-foreground">
                For a solo dev: don&apos;t fight TDS head-on. Ship a sharp twist
                on the format — a fresh theme, a tighter session loop — and take
                a slice of that tail. The demand is proven; the leader just
                isn&apos;t serving all of it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
