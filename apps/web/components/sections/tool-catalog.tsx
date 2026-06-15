import { capabilityGroups } from "@/lib/tools";
import { previewBySlug } from "./tool-previews";
import { Section, Eyebrow } from "./section";
import { FadeContent } from "@/components/ui/fade-content";

/**
 * Capability section — reworked into alternating editorial feature rows on the
 * muted scheme. Each row: a numbered label, the capability name in light Host
 * Grotesk, a blurb, the prompts you'd type — paired with a monochrome data
 * preview that alternates side. Hairline dividers, generous whitespace, and a
 * gentle scroll-reveal entrance per row. No icons, no colour.
 */
export function ToolCatalog() {
  return (
    <Section scheme="muted" id="capabilities" innerClassName="py-24 sm:py-32">
      <div className="mb-16 max-w-2xl">
        <Eyebrow>What the agent does</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-light tracking-[-0.04em] text-foreground sm:text-[2.75rem]">
          Ask in plain language.
          <br className="hidden sm:inline" /> Get a decision, not a chart.
        </h2>
        <p className="mt-5 text-[1.0625rem] leading-[1.6] text-foreground/60">
          Every answer is reasoned over live Roblox data — sized, scored, and
          ready to act on.
        </p>
      </div>

      <div className="border-t border-foreground/10">
        {capabilityGroups.map((group, idx) => {
          const Preview = previewBySlug[group.slug];
          const num = String(idx + 1).padStart(2, "0");
          const flip = idx % 2 === 1;
          return (
            <FadeContent
              key={group.slug}
              as="article"
              delay={0.04}
              className="grid items-center gap-8 border-b border-foreground/10 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16"
            >
              {/* copy */}
              <div className={flip ? "lg:order-2" : "lg:order-1"}>
                <span className="font-mono text-[11px] tracking-[0.18em] text-foreground/35 tabular-nums">
                  {num} / 06
                </span>
                <h3 className="mt-3 text-[1.6rem] leading-tight font-light tracking-[-0.03em] text-foreground sm:text-[1.9rem]">
                  {group.name}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-foreground/60">
                  {group.blurb}
                </p>
                <ul className="mt-6 space-y-2 border-t border-foreground/10 pt-5">
                  {group.capabilities.map((c) => (
                    <li
                      key={c.prompt}
                      className="flex items-start gap-2.5 text-[13.5px] leading-snug text-foreground/80"
                    >
                      <span className="mt-px select-none font-mono text-foreground/30">
                        →
                      </span>
                      <span>{c.prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* monochrome data preview */}
              <div className={flip ? "lg:order-1" : "lg:order-2"}>
                <Preview />
              </div>
            </FadeContent>
          );
        })}
      </div>
    </Section>
  );
}
