import SimpleMarquee from "@/components/fancy/simple-marquee";
import { integrations } from "@/lib/integrations";

const repeated = [...integrations, ...integrations];

export function IntegrationsBar() {
  return (
    <section
      id="integrations"
      className="scroll-mt-16 border-b border-border bg-background"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <p className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
            <span className="h-px w-6 bg-muted-foreground/40" aria-hidden />
            Works where you already work
            <span className="h-px w-6 bg-muted-foreground/40" aria-hidden />
          </p>
          <h2 className="text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-3xl">
            Claude Code · Cursor · Windsurf · Zed
          </h2>
        </div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

          <SimpleMarquee
            direction="left"
            baseVelocity={10}
            repeat={2}
            slowdownOnHover
            slowDownFactor={0.15}
            className="py-2"
          >
            <div className="flex shrink-0 items-center gap-16 pr-16 sm:gap-24 sm:pr-24">
              {repeated.map((integration, i) => (
                <span
                  key={`${integration.slug}-${i}`}
                  className="font-mono text-2xl font-medium tracking-tight whitespace-nowrap text-foreground/60 transition-colors hover:text-foreground sm:text-3xl"
                >
                  {integration.name}
                </span>
              ))}
            </div>
          </SimpleMarquee>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Any MCP-compliant client can launch{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
            bloxscout-mcp
          </code>{" "}
          as a stdio server.
        </p>
      </div>
    </section>
  );
}
