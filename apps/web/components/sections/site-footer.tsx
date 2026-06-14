import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 font-mono text-xs font-medium tracking-tight text-foreground">
            {site.name}
          </p>
          <p>
            bloxscout is an unofficial tool. Not affiliated with, endorsed by,
            or sponsored by Roblox Corporation or Super League Enterprise /
            Rotrends. Data is sourced from Roblox&apos;s public unauthenticated
            endpoints.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:items-end">
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={site.npm}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            npm
          </a>
          <span className="font-mono text-xs">{site.license} licensed</span>
        </div>
      </div>
    </footer>
  );
}
