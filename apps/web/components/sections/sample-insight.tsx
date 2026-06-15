import { Section, Eyebrow } from "./section";
import { FadeContent } from "@/components/ui/fade-content";

/**
 * Sample insight — "anatomy of an answer". A light, all-sans result panel that
 * shows the agent reading live signals (as stat tiles) and landing on a backed
 * verdict + recommendation. Data-focused and result-focused; no dark editorial
 * essay, no serif.
 */

const SIGNALS = [
  { label: "Cohort", value: "30 games" },
  { label: "Total demand", value: "274k CCU" },
  { label: "Leader share", value: "44%" },
  { label: "Tail games", value: "9 live" },
];

export function SampleInsight() {
  return (
    <Section scheme="light" id="sample" innerClassName="py-24 sm:py-32">
      <div className="mb-14 max-w-2xl">
        <Eyebrow>Anatomy of an answer</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-light tracking-[-0.035em] text-foreground sm:text-[2.6rem]">
          Every verdict shows its work.
        </h2>
        <p className="mt-5 text-[1.0625rem] leading-[1.6] text-foreground/60">
          You get the call and the evidence: the live signals it read, and the
          reasoning that turns them into a decision.
        </p>
      </div>

      <FadeContent className="overflow-hidden rounded-2xl border border-foreground/12 bg-background shadow-[0_40px_80px_-60px_rgba(23,23,29,0.4)]">
        {/* the question */}
        <div className="flex flex-wrap items-center gap-3 border-b border-foreground/10 px-6 py-5 sm:px-8">
          <span className="font-mono text-[10px] tracking-[0.18em] text-foreground/45 uppercase">
            You asked
          </span>
          <span className="text-[15px] text-foreground/85">
            Is tower defense saturated, or is there still room for a solo dev?
          </span>
        </div>

        <div className="grid gap-px bg-foreground/10 lg:grid-cols-[1fr_1.4fr]">
          {/* signals it read */}
          <div className="bg-background p-6 sm:p-8">
            <p className="mb-4 font-mono text-[10px] tracking-[0.16em] text-foreground/45 uppercase">
              Signals it read
            </p>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10">
              {SIGNALS.map((s) => (
                <div key={s.label} className="bg-background p-4">
                  <p className="font-mono text-[9px] tracking-[0.16em] text-foreground/45 uppercase">
                    {s.label}
                  </p>
                  <p className="tabular mt-1.5 text-lg font-medium text-foreground">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* the reasoned answer */}
          <div className="bg-background p-6 sm:p-8">
            <p className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-accent uppercase">
              <span className="grid size-4 place-items-center rounded-full bg-accent/10 text-accent">
                ✦
              </span>
              bloxscout
            </p>
            <div className="space-y-4 text-[15px] leading-[1.6] text-foreground/80">
              <p>
                Tower defense is{" "}
                <span className="font-medium text-accent">
                  contested, not locked
                </span>
                . Thirty live games share 274k players, but Tower Defense
                Simulator alone holds 44%. One incumbent, deeply entrenched.
              </p>
              <p>
                The opening is in the tail: nine smaller titles still pull real
                concurrents, so players are shopping the niche rather than
                defaulting to the leader. That fragmentation is your white space.
              </p>
              <p className="rounded-lg border-l-2 border-accent bg-accent/[0.04] py-3 pr-4 pl-5 text-foreground">
                For a solo dev: don&apos;t fight TDS head-on. Ship a sharp twist
                on the format, a fresh theme or a tighter session loop, and take
                a slice of that tail. The demand is proven; the leader just
                isn&apos;t serving all of it.
              </p>
            </div>
          </div>
        </div>
      </FadeContent>
    </Section>
  );
}
