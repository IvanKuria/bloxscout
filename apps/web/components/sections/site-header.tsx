import Link from "next/link";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          <span
            className="recon-pulse inline-block h-2 w-2 rounded-full bg-accent"
            aria-hidden
          />
          {site.name}
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <a
            href="#capabilities"
            className="transition-colors hover:text-foreground"
          >
            Capabilities
          </a>
          <a href="#sample" className="transition-colors hover:text-foreground">
            Sample answer
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
