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
    <Section tone="muted" id="capabilities" innerClassName="py-24 sm:py-32">
      <div className="mb-14 max-w-2xl">
        <Eyebrow>Capabilities</Eyebrow>
        <h2 className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
          Ask anything about the Roblox market.
        </h2>
        <p className="mt-5 text-[1.0625rem] leading-[1.6] text-muted-foreground">
          Six core questions, each answered from live player data, with the
          games and numbers behind every call.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilityGroups.map((group, idx) => {
          const Preview = previewBySlug[group.slug];
          const Icon = group.icon;
          const prompt = group.capabilities[0]?.prompt;
          return (
            <FadeContent
              key={group.slug}
              as="article"
              delay={(idx % 3) * 0.05}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
                  {group.name}
                </h3>
              </div>

              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                {group.blurb}
              </p>

              {/* live-data visual */}
              <div className="mt-1 rounded-xl border border-border bg-muted/60 p-4">
                <Preview />
              </div>

              {/* the prompt that triggers it */}
              {prompt ? (
                <p className="mt-auto flex items-start gap-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
                  <span className="shrink-0 font-medium text-foreground">Ask</span>
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
