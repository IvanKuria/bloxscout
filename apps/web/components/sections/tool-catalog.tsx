import { Card } from "@/components/ui/card";
import { capabilityGroups } from "@/lib/tools";
import { previewBySlug } from "./tool-previews";

export function ToolCatalog() {
  return (
    <section
      id="capabilities"
      className="scroll-mt-16 border-b border-border bg-secondary/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="mb-14 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-accent uppercase">
              <span className="h-px w-6 bg-accent" aria-hidden />
              What the agent does
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-[-0.01em] text-foreground sm:text-[40px] sm:leading-[1.05]">
              Ask in plain language.
              <br className="hidden sm:inline" /> Get a decision, not a chart.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every answer is reasoned over live Roblox data — sized, scored, and
              ready to act on.
            </p>
          </div>
          <p className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:block">
            01 — 06
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilityGroups.map((group, idx) => {
            const Icon = group.icon;
            const Preview = previewBySlug[group.slug];
            const num = String(idx + 1).padStart(2, "0");
            return (
              <Card
                key={group.slug}
                className="group flex flex-col gap-5 p-6 ring-foreground/10 transition-all hover:-translate-y-0.5 hover:ring-foreground/25"
              >
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
                    {num} / 06
                  </span>
                </div>

                <div>
                  <h3 className="font-heading text-lg font-medium tracking-tight text-foreground">
                    {group.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {group.blurb}
                  </p>
                </div>

                <Preview />

                <div className="mt-auto border-t border-border/70 pt-3">
                  <p className="mb-2 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                    try asking
                  </p>
                  <ul className="space-y-1.5">
                    {group.capabilities.map((c) => (
                      <li
                        key={c.prompt}
                        className="flex items-start gap-2 text-[12px] leading-snug text-foreground/85"
                      >
                        <span className="mt-0.5 select-none font-mono text-accent">
                          ›
                        </span>
                        <span className="transition-colors group-hover:text-foreground">
                          {c.prompt}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
