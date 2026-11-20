import * as React from "react"
import { cn } from "cn"

// shadcn Skeleton: a pulsing placeholder block. Size it with classes (h-4 w-32, size-10 rounded-full…).
function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-accent", className)} {...props} />
}

export { Skeleton }
