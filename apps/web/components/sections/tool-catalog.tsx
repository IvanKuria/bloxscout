import { Card } from "@/components/ui/card";
import { toolCategories, totalToolCount } from "@/lib/tools";
import { previewBySlug } from "./tool-previews";

export function ToolCatalog() {
  return (
    <section
      id="tools"
      className="scroll-mt-16 border-b border-border bg-secondary/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="mb-14 flex items-end justify-between gap-8">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-accent uppercase">
              <span className="h-px w-6 bg-accent" aria-hidden />
              The toolbox
            </p>
            <h2 className="text-3xl font-medium tracking-[-0.01em] text-foreground sm:text-4xl">
              {totalToolCount} tools, six categories,
              <br className="hidden sm:inline" /> one MCP server.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every tool is also a CLI subcommand. Ask your agent, or pipe the
              JSON yourself.
            </p>
          </div>
          <p className="hidden font-mono text-xs text-muted-foreground sm:block">
            01 — 06
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {toolCategories.map((category, idx) => {
            const Icon = category.icon;
            const Preview = previewBySlug[category.slug];
            const num = String(idx + 1).padStart(2, "0");
            return (
              <Card
                key={category.slug}
                className="group flex flex-col gap-5 border-border bg-card p-6 transition-colors hover:border-foreground/30"
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
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {category.blurb}
                  </p>
                </div>

                <Preview />

                <div className="mt-auto border-t border-border/70 pt-3">
                  <p className="mb-2 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                    {category.tools.length} tool
                    {category.tools.length === 1 ? "" : "s"}
                  </p>
                  <p className="font-mono text-[12px] leading-relaxed text-foreground/80">
                    {category.tools.map((t, i) => (
                      <span key={t.name}>
                        <span className="hover:text-accent transition-colors">
                          {t.name}
                        </span>
                        {i < category.tools.length - 1 && (
                          <span className="text-muted-foreground/40">
                            {" · "}
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
