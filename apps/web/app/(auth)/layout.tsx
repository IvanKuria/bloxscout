import Link from "next/link";
import { BrandLockup } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh flex-col bg-background px-6 py-8 text-foreground">
      {/* Minimal header: just the mark home. */}
      <header className="mx-auto flex w-full max-w-5xl items-center">
        <Link
          href="/"
          aria-label="bloxscout home"
          className="text-foreground transition-opacity hover:opacity-80"
        >
          <BrandLockup className="flex items-center gap-2 text-[15px]" />
        </Link>
      </header>

      {/* A single calm, centered column. */}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        {children}
      </div>
    </main>
  );
}
