import Link from "next/link";
import { site } from "@/lib/site";
import { CtaLink } from "./cta-link";

/**
 * Site footer. A dark closing CTA band (the page's final note) over a clean,
 * column-based footer on the muted scheme. No icon trail, no decoration — just
 * type, hairline dividers, and whitespace.
 */
export function SiteFooter() {
  return (
    <footer>
      {/* Closing CTA band — dark scheme */}
      <div data-scheme="dark" className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 sm:flex-row sm:items-center sm:justify-between sm:py-24">
          <h2 className="max-w-md text-[1.9rem] leading-[1.1] font-light tracking-[-0.04em] text-foreground sm:text-[2.5rem]">
            Find your next winning idea.
          </h2>
          <CtaLink href="/signup" size="lg">
            Start free
          </CtaLink>
        </div>
      </div>

      {/* Footer columns — muted scheme */}
      <div data-scheme="muted" className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="mb-3 font-mono text-[15px] font-medium tracking-[-0.01em] text-foreground">
              {site.name}
            </p>
            <p className="text-[13px] leading-relaxed text-foreground/55">
              An independent AI agent for Roblox developers. Not affiliated
              with, endorsed by, or sponsored by Roblox Corporation. Answers are
              grounded in Roblox&apos;s public player data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-3">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] tracking-[0.16em] text-foreground/40 uppercase">
                Product
              </span>
              {[
                ["/signup", "Start free"],
                ["/pricing", "Pricing"],
                ["/login", "Sign in"],
                ["/games", "Top games"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[13px] text-foreground/60 transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] tracking-[0.16em] text-foreground/40 uppercase">
                Company
              </span>
              {[
                ["/about/methodology", "Methodology"],
                ["/trending", "Trending"],
                ["/roblox-statistics", "Statistics"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[13px] text-foreground/60 transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
