import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * CtaLink — a Next.js <Link> styled in the OpenAI/ChatGPT idiom: pill-shaped
 * (rounded-full), calm, with the shared button colour variants wired to the
 * primary/secondary semantic tokens so it reads correctly in light and dark.
 * Used for all marketing CTAs so the homepage and pricing surfaces share one
 * button voice.
 */
const sizes = {
  sm: "h-9 px-4 text-sm",
  default: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
} as const;

export function CtaLink({
  href,
  children,
  variant = "default",
  size = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant }),
        "rounded-full font-medium",
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
