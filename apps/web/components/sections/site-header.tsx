import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          <span
            className="inline-block h-2 w-2 rounded-full bg-accent"
            aria-hidden
          />
          {site.name}
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <a href="#tools" className="transition-colors hover:text-foreground">
            Tools
          </a>
          <a
            href="#integrations"
            className="transition-colors hover:text-foreground"
          >
            Integrations
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-5">
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>GitHub</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
