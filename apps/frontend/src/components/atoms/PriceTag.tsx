import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * „Cenovka“: the price of an event on its card (system B, Gumroad Discover's price tag): an orange
 * fill with the amount in ink. A static marker, so no ink edge (DESIGN.md: an ink edge is for what
 * you can press) and no lift; the card around it is the link.
 */
// Figma (Design system v2): Togena / Brand / Cenovka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27719-4276
export function PriceTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      data-slot="price-tag"
      className={cn(
        "inline-flex w-fit items-center rounded-checkbox bg-brand-warm px-2 py-0.5 text-sm font-semibold whitespace-nowrap text-brand-warm-foreground tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  )
}
