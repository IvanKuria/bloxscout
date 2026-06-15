import Link from "next/link";
import { BrandLockup } from "@/components/brand-mark";

/** A single mono proof point with a duotone tick. */
function Proof({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.04em] text-foreground/55">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
      {children}
    </li>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      data-scheme="light"
      className="relative flex min-h-svh flex-col bg-background px-6 py-8 text-foreground"
    >
      {/* Faint engineering grid — the scout reads the field. */}
      <div className="recon-grid pointer-events-none absolute inset-0" aria-hidden />

      {/* Minimal header: just the mark home. */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center">
        <Link href="/" aria-label="bloxscout home" className="text-foreground">
          <BrandLockup className="flex items-center gap-2 text-[15px]" />
        </Link>
      </header>

      {/* Two columns on desktop: the pitch, then the panel. */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center py-10">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Pitch — hidden on small screens where the card leads. */}
          <div className="hidden lg:block">
            <h1 className="max-w-md text-[2.4rem] leading-[1.05] font-light tracking-[-0.035em] text-foreground">
              Start scouting the{" "}
              <span className="font-bold">Roblox economy.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[1.0625rem] leading-[1.6] text-foreground/60">
              Ask the agent what to build and whether you can win the niche,
              before you write a line of code.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              <Proof>Live data, refreshed every ~30 min</Proof>
              <Proof>Nothing to install, runs in your browser</Proof>
              <Proof>Free to start, no card required</Proof>
            </ul>
          </div>

          {/* The auth panel. */}
          <div className="w-full max-w-md justify-self-center lg:justify-self-end">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
