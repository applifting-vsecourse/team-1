import { parseISO } from "date-fns"

import { formatMonthShort } from "@/lib/date"
import { cn } from "@/lib/utils"

/**
 * „Datovka“: the start of a term as a calendar tile (system B, Luma's date tile): white, ink edge,
 * an orange strip with the short month in ink, the day big in ink. Decoration only (`aria-hidden`):
 * the dates are always in text next to it.
 */
// Figma (Design system v2): Togena / Brand / Datovka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27719-4271
export function DateTile({ date, className }: { date: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="date-tile"
      className={cn(
        "flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-md border border-border-strong bg-card pb-1 text-foreground",
        className,
      )}
    >
      <span className="w-full bg-brand-warm py-px text-center text-xs leading-4 font-semibold text-brand-warm-foreground">
        {formatMonthShort(date)}
      </span>
      <span className="text-xl/6.5 font-bold tabular-nums">{parseISO(date).getDate()}</span>
    </span>
  )
}
