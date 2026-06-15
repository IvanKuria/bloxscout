import Link from "next/link";
import { site } from "@/lib/site";
import { CtaLink } from "./cta-link";

const NAV = [
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#demo", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-mono text-[15px] font-medium tracking-[-0.01em] text-foreground"
        >
          {site.name}
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-[11px] tracking-[0.1em] text-foreground/55 uppercase transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden font-mono text-[11px] tracking-[0.1em] text-foreground/55 uppercase transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <CtaLink href="/signup" size="sm">
            Start free
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
