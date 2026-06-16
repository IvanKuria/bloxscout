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
    <Section tone="plain" id="sample" innerClassName="py-24 sm:py-32">
      <div className="mb-14 max-w-2xl">
        <Eyebrow>Anatomy of an answer</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
          Every verdict shows its work.
        </h2>
        <p className="mt-5 text-[1.0625rem] leading-[1.6] text-muted-foreground">
          You get the call and the evidence: the live signals it read, and the
          reasoning that turns them into a decision.
        </p>
      </div>

      <FadeContent className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/5">
        {/* the question */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-5 sm:px-8">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            You asked
          </span>
          <span className="text-[15px] text-foreground/90">
            Is tower defense saturated, or is there still room for a solo dev?
          </span>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr]">
          {/* signals it read */}
          <div className="border-b border-border p-6 sm:p-8 lg:border-r lg:border-b-0">
            <p className="mb-4 text-[11px] font-medium tracking-wide text-muted-foreground">
              Signals it read
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SIGNALS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-muted/50 p-4"
                >
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="tabular mt-1.5 text-lg font-semibold text-foreground">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* the reasoned answer */}
          <div className="p-6 sm:p-8">
            <p className="mb-4 inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
              <span className="grid size-4 place-items-center rounded-full bg-muted text-foreground">
                ✦
              </span>
              bloxscout
            </p>
            <div className="space-y-4 text-[15px] leading-[1.6] text-foreground/80">
              <p>
                Tower defense is{" "}
                <span className="font-medium text-foreground">
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
              <p className="rounded-xl border-l-2 border-border bg-muted/60 py-3 pr-4 pl-5 text-foreground">
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
