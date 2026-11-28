import type { ComponentProps } from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * A card with something left to do: white, the ink edge and the 4 px orange „Pruh úkolu“ on top
 * (system B: this is yours to settle), like PriceSummary. Never a peach surface.
 */
// Figma (Design system v2): Togena / Brand / Pruh úkolu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27719-4279
export function TaskCard({ className, children, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      // The strip covers the top edge as in Figma: the 1 px top border turns orange and a 3 px strip
      // inside it (clipped to the rounded card) makes the 4 px; the content moves down by 4 px.
      className={cn("relative gap-3 overflow-hidden border-t-brand-warm p-4 pt-5", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="task-strip"
        className="absolute inset-x-0 top-0 h-0.75 bg-brand-warm"
      />
      {children}
    </Card>
  )
}
