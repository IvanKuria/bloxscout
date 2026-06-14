import { NicheShowcase, type ShowcaseGame } from "./niche-carousel";

/**
 * The "games on the radar" section — a server shell with an editorial heading
 * and the interactive 3D cube (client). Renders nothing if we couldn't assemble
 * at least four games with icons (graceful when the dataset is thin).
 */
export function NicheShowcaseSection({ games }: { games: ShowcaseGame[] }) {
  if (games.length < 4) return null;

  return (
    <section
      id="radar"
      className="scroll-mt-16 overflow-hidden border-b border-border bg-background"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-accent uppercase">
            <span className="h-px w-6 bg-accent" aria-hidden />
            On the radar
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.01em] text-foreground sm:text-[40px] sm:leading-[1.05]">
            The agent is reading every one of these — live.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            A live slice of the games bloxscout is tracking right now. Spin the
            cube. Behind each icon: real concurrents, growth, and the niche it
            belongs to — the same signal the agent reasons over to tell you where
            the white space is.
          </p>
        </div>

        <NicheShowcase games={games} />
      </div>
    </section>
  );
}
