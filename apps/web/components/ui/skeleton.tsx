import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-current/10 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
