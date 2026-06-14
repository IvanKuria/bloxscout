/**
 * "Ask bloxscout" prompt CTA — the conversion slot shared by the programmatic
 * SEO pages. Every public page is an acquisition surface; this component is the
 * action that turns a reader into a (metered) prompt user.
 *
 * INTEGRATION SLOT: the freemium chat product (prompt-metered, built on a
 * parallel branch) is the real destination. Until those branches merge, each
 * example prompt links to `/signup?q=<prompt>` so the value is demonstrated and
 * the prompt text survives the round-trip. When the chat lands, repoint `href`
 * at the in-app composer (it can read `?q=` to prefill the first prompt). No
 * other file needs to change.
 */
import Link from "next/link";

export interface AskBloxscoutProps {
  /** Short heading, e.g. "Ask bloxscout about Adopt Me". */
  heading: string;
  /** One-line value framing under the heading. */
  blurb: string;
  /** 2-4 entity-specific example prompts. These ARE the demo of the product. */
  prompts: string[];
}

/** Where a prompt chip points until the in-app chat composer exists. */
function promptHref(prompt: string): string {
  return `/signup?q=${encodeURIComponent(prompt)}`;
}

export function AskBloxscout({ heading, blurb, prompts }: AskBloxscoutProps) {
  return (
    <section
      aria-labelledby="ask-heading"
      className="my-16 rounded-xl border border-accent/30 bg-accent/5 p-6 sm:p-7"
    >
      <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        Ask bloxscout
      </p>
      <h2
        id="ask-heading"
        className="font-heading text-2xl font-semibold tracking-tight text-foreground"
      >
        {heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {blurb}
      </p>
      <ul className="mt-5 flex flex-col gap-2.5">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <Link
              href={promptHref(prompt)}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-accent/50 hover:bg-secondary"
            >
              <span className="min-w-0 text-foreground">
                <span className="mr-2 font-mono text-accent" aria-hidden>
                  &rsaquo;
                </span>
                {prompt}
              </span>
              <span
                className="shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-accent"
                aria-hidden
              >
                Ask &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Free to start — the first few questions are on us.
      </p>
    </section>
  );
}
