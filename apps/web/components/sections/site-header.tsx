import Link from "next/link";
import { CtaLink } from "./cta-link";
import { BrandLockup } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#demo", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="bloxscout home" className="text-foreground">
          <BrandLockup className="flex items-center gap-2 text-[15px]" />
        </Link>

        <nav className="hidden items-center gap-7 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="text-muted-foreground" />
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
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
