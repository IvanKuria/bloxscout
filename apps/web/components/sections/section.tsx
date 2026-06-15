import { cn } from "@/lib/utils";

/**
 * Section — the twenty.com rhythm primitive. Each section declares a
 * `data-scheme` (light / muted / dark) which swaps the background + ink tokens
 * (defined in globals.css). Alternating schemes — not horizontal rules — give
 * the page its structure. A hairline top divider separates same-direction
 * neighbours; turn it off with `divider={false}`.
 */
export function Section({
  scheme = "light",
  id,
  className,
  innerClassName,
  divider = true,
  children,
}: {
  scheme?: "light" | "muted" | "dark";
  id?: string;
  className?: string;
  innerClassName?: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-scheme={scheme}
      className={cn(
        "scroll-mt-16",
        divider && "border-t border-border",
        className,
      )}
    >
      <div className={cn("mx-auto max-w-6xl px-6", innerClassName)}>
        {children}
      </div>
    </section>
  );
}

/** Small uppercase mono eyebrow used above section headings. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] text-foreground/45 uppercase",
        className,
      )}
    >
      <span className="h-px w-6 bg-foreground/25" aria-hidden />
      {children}
    </p>
  );
}
