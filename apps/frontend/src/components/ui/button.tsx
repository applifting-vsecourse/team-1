import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Figma (Design system v2): Togena / Actions / Button · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15188-91
// Brand look A (specimen · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27535-3692):
// a button with an ink edge lifts on hover onto a hard ink shadow and settles back when pressed;
// disabled is flat grey, a pending one (`aria-busy`) keeps its colours. Heights follow DESIGN.md (default 40, lg 44).
const raised =
  "border border-border-strong lift not-aria-busy:disabled:bg-disabled not-aria-busy:disabled:text-disabled-foreground"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control text-sm font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: `${raised} bg-primary text-primary-foreground active:bg-primary-pressed`,
        destructive: `${raised} bg-action-destructive text-action-destructive-foreground active:bg-action-destructive-pressed`,
        success: `${raised} bg-status-success text-white dark:text-background`,
        outline: `${raised} bg-card text-foreground`,
        secondary: `${raised} bg-secondary text-secondary-foreground`,
        // Quiet: no edge and no lift, a wash surface on hover.
        ghost:
          "transition-colors hover:bg-action-subtle active:bg-accent disabled:text-disabled-foreground",
        link: "text-primary underline-offset-4 hover:underline disabled:text-disabled-foreground",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-sm px-3 has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 px-5 has-[>svg]:px-4",
        xl: "h-12 gap-2 pr-5 pl-6 text-base font-semibold",
        icon: "size-10",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
