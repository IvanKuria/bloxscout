import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Twenty.com-style button: Azeret Mono, UPPERCASE, 12px, 4px radius. Contained
 * (charcoal bg / white text → lighter on hover) and outlined variants share a
 * sliding-fill hover — a pseudo-element wipes in on a soft cubic-bezier — plus a
 * 1px focus ring. Monochrome throughout; no brand colour.
 */
const buttonVariants = cva(
  "group/button relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] border font-mono text-[12px] font-medium tracking-[0.04em] uppercase whitespace-nowrap transition-colors duration-300 outline-none select-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 [&>*]:relative [&>*]:z-10",
  {
    variants: {
      variant: {
        // Contained — charcoal fill, white text; sliding lighter fill on hover.
        default:
          "border-transparent bg-foreground text-background before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-[color-mix(in_srgb,var(--foreground)_72%,var(--background))] before:transition-transform before:duration-[260ms] before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:before:scale-x-100",
        // Outlined — hairline border; charcoal fill slides in, text inverts.
        outline:
          "border-foreground/20 bg-transparent text-foreground before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-foreground before:transition-transform before:duration-[260ms] before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-foreground hover:text-background hover:before:scale-x-100",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-foreground/10",
        ghost:
          "border-transparent bg-transparent text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06]",
        link: "border-transparent text-foreground underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-10 gap-2 px-5",
        sm: "h-8 gap-1.5 px-3.5 text-[11px]",
        lg: "h-12 gap-2 px-7",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
