import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Class for a card that needs the whole row of a `CardGrid` (a wide table, a long form). */
export const CARD_GRID_WIDE = "lg:col-span-2"

/**
 * The layout of event tabs made of several small or medium cards (settings, kitchen summary,
 * accommodation side cards, overview): one column up to `lg`, two columns from there, ordered by
 * importance, wide items spanning both. Data tables and forms are not put in it: tables keep the
 * full column, forms keep a readable width. Cards stay `items-start` unless a caller passes
 * `items-stretch` (cards that are links and should be equally tall).
 */
export function CardGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-6 lg:grid-cols-2 print:grid-cols-1",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Two independent stacks for cards of very different height (kitchen summary): from `lg` the
 * `left` and `right` cards stack tightly in their own column, so there are no row gaps. Below `lg`
 * (and in print) both stacks dissolve into one column; give the cards `order-N lg:order-none` to
 * set the single-column order.
 */
export function CardColumns({
  left,
  right,
  className,
}: {
  left: ReactNode
  right: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-start print:flex-col print:items-stretch",
        className,
      )}
    >
      <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-6 print:contents">
        {left}
      </div>
      <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-6 print:contents">
        {right}
      </div>
    </div>
  )
}
