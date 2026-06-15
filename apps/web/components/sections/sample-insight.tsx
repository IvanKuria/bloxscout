import { Section, Eyebrow } from "./section";
import { FadeContent } from "@/components/ui/fade-content";

/**
 * Sample insight — the "potential" moment. A static, editorial recreation of a
 * full agent answer to a "what should I build?" question, on the DARK scheme so
 * it lands as the page's quiet climax. The verdict is set in light Aleo serif;
 * the signals it read are mono read-outs. Shows the agent's voice: it reasons
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
    <Section scheme="dark" id="sample" innerClassName="py-24 sm:py-32">
      <div className="mb-14 max-w-2xl">
        <Eyebrow>A real answer</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-light tracking-[-0.04em] text-foreground sm:text-[2.75rem]">
          Not a dashboard. A point of view.
        </h2>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        {/* the question + the signals it read */}
        <FadeContent className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-foreground/[0.04] p-6">
            <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-foreground/45 uppercase">
              you asked
            </p>
            <p className="font-serif text-xl leading-snug text-foreground/90">
              &ldquo;Is tower defense saturated, or is there still room for a
              solo dev?&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {SIGNALS.map((s) => (
              <div key={s.label} className="bg-[#1c1c1c] p-5">
                <p className="font-mono text-[10px] tracking-[0.16em] text-foreground/45 uppercase">
                  {s.label}
                </p>
                <p className="tabular mt-2 font-mono text-xl font-medium text-foreground">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </FadeContent>

        {/* the agent's reasoned answer */}
        <FadeContent
          delay={0.08}
          className="relative rounded-lg border border-border bg-foreground/[0.04] p-7 sm:p-10"
        >
          <p className="mb-6 font-mono text-[10px] tracking-[0.18em] text-foreground/50 uppercase">
            bloxscout agent
          </p>
          <div className="space-y-5 text-[15.5px] leading-[1.65] text-foreground/80">
            <p>
              Tower defense is{" "}
              <span className="text-foreground">contested, not locked</span>.
              Thirty live games share 274k players, but Tower Defense Simulator
              alone holds 44% of them — one incumbent, deeply entrenched.
            </p>
            <p>
              The opening is in the tail. Nine smaller titles still pull real
              concurrents, which means players are actively shopping the niche
              rather than defaulting to the leader. That fragmentation is your
              white space.
            </p>
            <p className="border-l border-foreground/40 pl-5 font-serif text-[17px] leading-relaxed text-foreground">
              For a solo dev: don&apos;t fight TDS head-on. Ship a sharp twist on
              the format — a fresh theme, a tighter session loop — and take a
              slice of that tail. The demand is proven; the leader just
              isn&apos;t serving all of it.
            </p>
          </div>
        </FadeContent>
      </div>
    </Section>
  );
}
