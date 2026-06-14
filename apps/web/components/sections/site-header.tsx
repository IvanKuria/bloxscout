import Link from "next/link";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          {/* Bracket mark — the wordmark stands on its own, no pulsing dot. */}
          <span
            className="text-accent transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          >
            [
          </span>
          {site.name}
          <span
            className="text-accent transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            ]
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <Link
            href="/#capabilities"
            className="transition-colors hover:text-foreground"
          >
            Capabilities
          </Link>
          <Link
            href="/#radar"
            className="transition-colors hover:text-foreground"
          >
            On the radar
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
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
