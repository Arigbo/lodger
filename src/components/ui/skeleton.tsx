import { cn } from "@/lib/utils"

/** Placeholder block with a soft shimmer sweep (respects reduced motion via globals.css). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent dark:before:via-white/10",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
