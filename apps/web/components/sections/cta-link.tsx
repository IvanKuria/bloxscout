import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * CtaLink — a Next.js <Link> styled with the shared twenty-style button system
 * (Azeret Mono, uppercase, 4px radius, sliding-fill hover). Used for all
 * marketing CTAs so the homepage and pricing surfaces share one button voice.
 */
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
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      <span>{children}</span>
    </Link>
  );
}
