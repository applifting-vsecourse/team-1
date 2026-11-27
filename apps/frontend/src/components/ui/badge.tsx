import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Figma (Design system v2): Togena / Badge · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15189-163
// Brand look A (specimen, Stavový štítek · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27536-3780):
// an ink-edged pill on the tone's surface with ink text; an icon takes the tone's colour. Never lifts.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-border-strong px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground transition-[color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-accent [a&]:hover:bg-accent/80",
        secondary: "bg-secondary [a&]:hover:bg-secondary/90",
        neutral: "bg-muted [&>svg]:text-muted-foreground",
        positive: "bg-status-success-bg [&>svg]:text-status-success",
        danger: "bg-status-error-bg [&>svg]:text-field-error",
        // A confirmed / done state is Tone=Positive.
        success: "bg-status-success-bg [&>svg]:text-status-success",
        warning: "bg-status-warning-bg [&>svg]:text-status-warning",
        info: "bg-status-info-bg [&>svg]:text-status-info",
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
