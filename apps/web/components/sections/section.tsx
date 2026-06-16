import { cn } from "@/lib/utils";

/**
 * Section — the marketing layout primitive in the OpenAI/ChatGPT idiom. Sections
 * read cleanly on the global theme: pass `tone="muted"` to sit on `bg-muted`
 * for quiet alternation, or the default `tone="plain"` to sit on `bg-background`.
 * A hairline top divider separates neighbours; turn it off with `divider={false}`.
 */
export function Section({
  tone = "plain",
  id,
  className,
  innerClassName,
  divider = true,
  children,
}: {
  tone?: "plain" | "muted";
  id?: string;
  className?: string;
  innerClassName?: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16",
        tone === "muted" ? "bg-muted" : "bg-background",
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

/**
 * Eyebrow — a small, calm green pill that labels a section. Sentence case, no
 * mono, no uppercase tracking; reads quietly in both light and dark.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[13px] font-medium text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
      {children}
    </span>
  );
}
