import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"

// shadcn Empty: an empty state (no data, no results, no access, not configured).
//   <Empty><EmptyHeader><EmptyMedia variant="icon"><Icon name="inbox" /></EmptyMedia>
//     <EmptyTitle>Nothing here</EmptyTitle><EmptyDescription>…</EmptyDescription></EmptyHeader>
//     <EmptyContent><Button>…</Button></EmptyContent></Empty>
// Sizes with the container, not the viewport (widgets live in narrow slots too).
function Empty({ className, ...props }) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border-dashed p-6 text-center text-balance",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }) {
  return <div data-slot="empty-header" className={cn("flex max-w-sm flex-col items-center gap-2 text-center", className)} {...props} />
}

const emptyMediaVariants = cva(
  "mb-1 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-10 shrink-0 rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function EmptyMedia({ className, variant = "default", ...props }) {
  return <div data-slot="empty-icon" data-variant={variant} className={cn(emptyMediaVariants({ variant }), className)} {...props} />
}

function EmptyTitle({ className, ...props }) {
  return <div data-slot="empty-title" className={cn("text-base font-medium tracking-tight", className)} {...props} />
}

function EmptyDescription({ className, ...props }) {
  return (
    <div
      data-slot="empty-description"
      className={cn("text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", className)}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }) {
  return <div data-slot="empty-content" className={cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-3 text-sm text-balance", className)} {...props} />
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia, emptyMediaVariants }
