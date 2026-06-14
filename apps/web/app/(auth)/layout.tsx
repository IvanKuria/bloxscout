import Link from "next/link";
import { site } from "@/lib/site";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-console px-6 py-16 text-console-foreground">
      {/* Faint engineering grid backdrop. */}
      <div className="recon-grid pointer-events-none absolute inset-0" aria-hidden />
      {/* Subtle vignette so the panel reads as a lit console in the dark. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(226,35,26,0.06),transparent_70%)]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-console-foreground"
        >
          <span
            className="recon-pulse inline-block h-2 w-2 rounded-full bg-accent"
            aria-hidden
          />
          {site.name}
        </Link>
        {children}
      </div>
    </main>
  );
}
