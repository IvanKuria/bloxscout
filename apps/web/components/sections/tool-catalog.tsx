import { capabilityGroups } from "@/lib/tools";
import { previewBySlug } from "./tool-previews";
import { Section, Eyebrow } from "./section";
import { FadeContent } from "@/components/ui/fade-content";

/**
 * Capabilities — a dense grid of result cards (twenty/hex data-product feel),
 * not a marketing feature list. Each card pairs the question you'd ask with the
 * actual shape of the answer: a thin line icon, the capability, a one-line
 * outcome, a compact live-data visual, and the real prompt that triggers it.
 */
export function ToolCatalog() {
  return (
    <Section scheme="muted" id="capabilities" innerClassName="py-24 sm:py-32">
      <div className="mb-14 max-w-2xl">
        <Eyebrow>Capabilities</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-light tracking-[-0.035em] text-foreground sm:text-[2.6rem]">
          Ask anything about the Roblox market.
        </h2>
        <p className="mt-5 text-[1.0625rem] leading-[1.6] text-foreground/60">
          Six core questions, each answered from live player data, with the
          games and numbers behind every call.
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-3">
        {capabilityGroups.map((group, idx) => {
          const Preview = previewBySlug[group.slug];
          const Icon = group.icon;
          const prompt = group.capabilities[0]?.prompt;
          return (
            <FadeContent
              key={group.slug}
              as="article"
              delay={(idx % 3) * 0.05}
              className="flex flex-col gap-4 bg-background p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-foreground/12 bg-foreground/[0.03] text-foreground/70">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
                  {group.name}
                </h3>
              </div>

              <p className="text-[13.5px] leading-relaxed text-foreground/60">
                {group.blurb}
              </p>

              {/* live-data visual */}
              <div className="mt-1 rounded-lg border border-foreground/10 bg-muted-surface/50 p-4">
                <Preview />
              </div>

              {/* the prompt that triggers it */}
              {prompt ? (
                <p className="mt-auto flex items-start gap-2 border-t border-foreground/10 pt-4 text-[13px] text-foreground/70">
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
                    Ask
                  </span>
                  <span className="leading-snug">{prompt}</span>
                </p>
              ) : null}
            </FadeContent>
          );
        })}
      </div>
    </Section>
  );
}
