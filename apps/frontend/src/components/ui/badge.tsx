import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground [a&]:hover:bg-accent/80",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        // Figma (Design system v2): Togena / Badge Tone=Neutral, Positive and Danger, solid
        // pills · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15189-163
        neutral: "bg-badge-neutral text-badge-foreground",
        positive: "bg-badge-positive text-badge-foreground",
        danger: "bg-badge-danger text-badge-foreground",
        // A confirmed / done state is Tone=Positive.
        success: "bg-badge-positive text-badge-foreground",
        // Tinted tones (Figma DS / Badge Tone=Warning and Info) without a v2 solid counterpart.
        warning: "bg-status-warning-bg text-status-warning",
        info: "bg-status-info-bg text-status-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
