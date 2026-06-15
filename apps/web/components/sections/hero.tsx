import { CtaLink } from "./cta-link";
import { BlurText } from "@/components/ui/blur-text";

/**
 * Hero — the signature moment, rebuilt in the minimal twenty.com idiom.
 *
 * Left: a light-weight (300) large headline with a restrained word-by-word
 * BlurText reveal, a subhead, and a contained/outlined CTA pair. Right: the
 * product visual is PURELY TYPOGRAPHIC + DATA — a monochrome recreation of the
 * agent answering a niche question inside a subtle browser frame: the verdict,
 * stat read-outs in Azeret Mono, and a ranked TEXT leaderboard with thin share
 * bars. No Roblox thumbnails or icons anywhere. The analysis sells the value.
 */
export function Hero() {
  return (
    <section
      data-scheme="light"
      className="relative overflow-hidden bg-background"
    >
      {/* Very faint, desaturated radial — near-grey, well under 12%. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_-15%,rgba(28,28,28,0.05),transparent_60%)]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-6 pt-24 pb-24 sm:pt-28 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:gap-12 lg:pt-32 lg:pb-32">
        <div className="lg:max-w-xl">
          <p className="mb-8 inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] text-foreground/45 uppercase">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="recon-pulse absolute inline-flex h-full w-full rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground" />
            </span>
            The leading AI agent for Roblox devs
          </p>

          <h1 className="text-[2.6rem] leading-[1.04] font-light tracking-[-0.04em] text-foreground sm:text-[3.4rem] lg:text-[3.75rem]">
            <BlurText
              text="Create and validate"
              animateBy="words"
              delay={70}
              className="block"
            />
            <span className="block text-foreground/55">
              <BlurText
                text="game ideas before"
                animateBy="words"
                delay={70}
                className="block"
              />
            </span>
            <BlurText
              text="you build them."
              animateBy="words"
              delay={70}
              className="block"
            />
          </h1>

          <p className="mt-7 max-w-md text-[1.0625rem] leading-[1.6] text-foreground/65">
            bloxscout reasons over the live Roblox economy to tell you what to
            build, whether a niche is still winnable, and which games are
            breaking out — a real verdict, grounded in current data, not a
            guess.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <CtaLink href="/signup" size="lg">
              Start free
            </CtaLink>
            <CtaLink href="#demo" variant="outline" size="lg">
              See it work
            </CtaLink>
          </div>

          <p className="mt-6 font-mono text-[11px] tracking-[0.04em] text-foreground/40">
            Nothing to install · live data, refreshed every ~30 min
          </p>
        </div>

        {/* Typographic product visual — a browser-framed agent answer. */}
        <div className="relative">
          <HeroAnswer />
        </div>
      </div>
    </section>
  );
}

const LEADERS = [
  { name: "Tower Defense Simulator", share: 44, ccu: "121k" },
  { name: "Toilet Tower Defense", share: 21, ccu: "58k" },
  { name: "Ultimate Tower Defense", share: 10, ccu: "27k" },
  { name: "Anime Defenders", share: 7, ccu: "19k" },
  { name: "All Star Tower Defense", share: 5, ccu: "14k" },
];

const STATS = [
  { label: "games", value: "30" },
  { label: "total ccu", value: "274k" },
  { label: "top-1 share", value: "44%" },
];

/** Static, server-rendered recreation of the agent's niche verdict. */
function HeroAnswer() {
  return (
    <div className="overflow-hidden rounded-lg border border-foreground/12 bg-background shadow-[0_1px_0_0_rgba(28,28,28,0.03),0_40px_80px_-52px_rgba(28,28,28,0.4)]">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-foreground/10 bg-muted-surface px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full border border-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full border border-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full border border-foreground/15" />
        </span>
        <span className="ml-2 font-mono text-[10px] tracking-[0.14em] text-foreground/40 uppercase">
          bloxscout · niche scan
        </span>
      </div>

      <div className="flex flex-col gap-5 p-6 sm:p-7">
        {/* the question */}
        <p className="font-serif text-lg leading-snug font-normal text-foreground/80">
          &ldquo;Is tower defense saturated, or is there still room for a solo
          dev?&rdquo;
        </p>

        {/* verdict */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.16em] text-foreground/45 uppercase">
            Verdict
          </span>
          <span className="text-xl font-light tracking-[-0.03em] text-foreground">
            Open · white space
          </span>
        </div>

        {/* stat read-outs */}
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-foreground/10 bg-foreground/10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-background px-3.5 py-3">
              <p className="font-mono text-[9.5px] tracking-[0.14em] text-foreground/45 uppercase">
                {s.label}
              </p>
              <p className="tabular mt-1 font-mono text-lg font-medium text-foreground">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ranked text leaderboard with thin share bars */}
        <div>
          <p className="mb-2.5 font-mono text-[9.5px] tracking-[0.16em] text-foreground/40 uppercase">
            who owns the niche now
          </p>
          <ul className="flex flex-col gap-2.5">
            {LEADERS.map((g, i) => (
              <li key={g.name} className="flex items-center gap-3">
                <span className="w-4 shrink-0 font-mono text-[10px] tabular-nums text-foreground/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="w-40 shrink-0 truncate text-[12.5px] text-foreground/80">
                  {g.name}
                </span>
                <span
                  className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/10"
                  aria-hidden
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                    style={{ width: `${g.share}%` }}
                  />
                </span>
                <span className="tabular w-9 shrink-0 text-right font-mono text-[11px] text-foreground/55">
                  {g.share}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
