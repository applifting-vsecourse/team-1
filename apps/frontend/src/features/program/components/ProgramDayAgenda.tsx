import { useId } from "react"
import { MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ProgramBlock } from "@/features/program/api/program"
import { calendarDays, formatDay, resolveDay, timeRange } from "@/features/program/lib/days"

// Figma v2: M14 (23266-93029) and M16 (23270-27504), adapted to a single-day agenda for #663.
// https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23266-93029
export function ProgramDayAgenda({
  term,
  onSelect,
  selectedDay,
  onDayChange,
}: {
  term: { startsOn: string; endsOn: string; blocks: ProgramBlock[] }
  onSelect: (block: ProgramBlock) => void
  selectedDay: string
  onDayChange: (day: string) => void
}) {
  const { t } = useTranslation("program")
  const dayField = useId()
  const days = calendarDays(term)
  const day = resolveDay(term, selectedDay)
  const blocks = term.blocks
    .filter((block) => block.date === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))

  return (
    <section
      aria-label={t("calendarLabel")}
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={dayField}>{t("dayLabel")}</Label>
        <Select
          value={day}
          onValueChange={onDayChange}
        >
          <SelectTrigger
            id={dayField}
            className="w-full bg-card"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {days.map((date) => (
              <SelectItem
                key={date}
                value={date}
              >
                {formatDay(date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {blocks.length ? (
        <ul className="min-w-0 space-y-2">
          {blocks.map((block) => (
            <li key={block.id}>
              <button
                type="button"
                aria-label={`${t("info", { name: block.name })} · ${timeRange(block)}${block.place ? ` · ${block.place}` : ""}`}
                className="flex min-h-11 w-full flex-col items-start gap-1 rounded-checkbox border-l-4 border-l-primary bg-accent px-3 py-2 text-left text-sm text-accent-foreground transition-colors outline-none hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
                onClick={() => onSelect(block)}
              >
                <span className="text-xs text-muted-foreground tabular-nums">
                  {timeRange(block)}
                </span>
                <span className="w-full break-words text-foreground">{block.name}</span>
                {block.place && (
                  <span className="flex w-full items-start gap-1 text-xs text-muted-foreground">
                    <MapPin
                      aria-hidden
                      className="size-3 shrink-0"
                    />
                    <span className="min-w-0 break-words">{block.place}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : term.blocks.length ? (
        <p className="text-sm text-muted-foreground">{t("emptyDay")}</p>
      ) : null}
    </section>
  )
}
