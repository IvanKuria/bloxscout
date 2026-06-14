import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-background">
      {/* Closing CTA band */}
      <div className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <h2 className="font-heading text-2xl font-semibold tracking-[-0.01em] text-foreground sm:text-3xl">
            Find your next winning idea.
          </h2>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-[0_10px_24px_-12px_rgba(226,35,26,0.7)] transition-colors hover:bg-accent-hover"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 inline-flex items-center gap-2 font-mono text-xs font-medium tracking-tight text-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden />
            {site.name}
          </p>
          <p>
            An independent AI agent for Roblox developers. Not affiliated with,
            endorsed by, or sponsored by Roblox Corporation. Answers are grounded
            in Roblox&apos;s public player data.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground/60 uppercase">
              Product
            </span>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              Start free
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/games" className="transition-colors hover:text-foreground">
              Top games
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground/60 uppercase">
              Company
            </span>
            <Link
              href="/about/methodology"
              className="transition-colors hover:text-foreground"
            >
              Methodology
            </Link>
            <Link href="/trending" className="transition-colors hover:text-foreground">
              Trending
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
