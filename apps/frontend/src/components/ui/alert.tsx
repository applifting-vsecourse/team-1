import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Figma (Design system v2): Togena / Feedback / Alert · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15219-4375
// Brand look A (specimen, Hláška · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27536-3828):
// feedback, not an action, so no ink edge (DESIGN.md): the tone's surface, ink text, the icon in the tone's colour.
// The 1 px transparent edge keeps the padding; a screen may still colour it. No shadow, no motion.
const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border border-transparent p-4 text-sm text-foreground has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        // Tone=Info
        default: "bg-wash [&>svg]:text-status-info",
        warning: "bg-status-warning-bg [&>svg]:text-status-warning",
        // Tone=Error
        destructive: "bg-status-error-bg [&>svg]:text-field-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 min-h-5 min-w-0 font-medium break-words", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
