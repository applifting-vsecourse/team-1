import { MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { ProgramBlock } from "@/features/program/api/program"
import { HOUR_HEIGHT, hourRange, placeBlocks, toMinutes } from "@/features/program/lib/calendar"
import { calendarDays, formatDayHeader } from "@/features/program/lib/days"

const GUTTER = "3.5rem"
const DAY_MIN = "9.5rem"

// Design: Figma (Design system) US-66 · O35 Program termínu (calendar) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23263-91745
/**
 * The program of a term as a calendar: a column per day of the term, hours down the side and every
 * block drawn over its time span with its full name. A click on a block opens its details (`onSelect`).
 */
export function ProgramCalendar({
  term,
  onSelect,
}: {
  term: { startsOn: string; endsOn: string; blocks: ProgramBlock[] }
  onSelect: (block: ProgramBlock) => void
}) {
  const { t } = useTranslation("program")
  const days = calendarDays(term)
  const { from, to } = hourRange(term.blocks)
  const hours = Array.from({ length: to - from }, (_, index) => from + index)
  const columns = `${GUTTER} repeat(${String(days.length)}, minmax(${DAY_MIN}, 1fr))`

  return (
    <section
      aria-label={t("calendarLabel")}
      className="overflow-x-auto rounded-lg border bg-card shadow-sm"
    >
      <div className="min-w-max">
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: columns }}
        >
          <div className="sticky left-0 z-20 bg-card" />
          {days.map((day) => {
            const header = formatDayHeader(day)
            return (
              <h2
                key={day}
                className="flex items-baseline gap-2 border-l px-3 py-3 text-sm"
              >
                <span className="font-semibold">{header.weekday}</span>
                <span className="text-muted-foreground">{header.date}</span>
              </h2>
            )
          })}
        </div>
        <div
          className="relative"
          style={{ height: hours.length * HOUR_HEIGHT }}
        >
          <div
            aria-hidden
            className="absolute inset-0"
          >
            {hours.map((hour, index) => (
              <div
                key={hour}
                className={cn("absolute inset-x-0 border-border", index > 0 && "border-t")}
                style={{ top: index * HOUR_HEIGHT }}
              />
            ))}
          </div>
          <div
            className="relative grid h-full"
            style={{ gridTemplateColumns: columns }}
          >
            <div
              aria-hidden
              className="sticky left-0 z-20 bg-card"
            >
              {hours.map((hour, index) => (
                <span
                  key={hour}
                  className="absolute left-0 w-full pr-2 text-right font-mono text-xs text-muted-foreground"
                  style={{ top: index * HOUR_HEIGHT + (index > 0 ? 4 : 0) }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {days.map((day) => (
              <div
                key={day}
                className="relative border-l"
              >
                {placeBlocks(term.blocks.filter((block) => block.date === day)).map((item) => (
                  <CalendarBlock
                    key={item.block.id}
                    block={item.block}
                    column={item.column}
                    columns={item.columns}
                    from={from}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CalendarBlock({
  block,
  column,
  columns,
  from,
  onSelect,
}: {
  block: ProgramBlock
  column: number
  columns: number
  from: number
  onSelect: (block: ProgramBlock) => void
}) {
  const { t } = useTranslation("program")
  const start = toMinutes(block.startTime)
  const minutes = Math.max(toMinutes(block.endTime) - start, 30)
  return (
    <article
      className="absolute rounded-md border border-l-4 border-primary/20 border-l-primary bg-accent text-accent-foreground transition-colors hover:border-primary/50 hover:border-l-primary"
      style={{
        top: ((start - from * 60) / 60) * HOUR_HEIGHT + 1,
        // The block is at least as tall as its time span and grows so the whole name always shows.
        minHeight: (minutes / 60) * HOUR_HEIGHT - 2,
        left: `calc(${String((column * 100) / columns)}% + 2px)`,
        width: `calc(${String(100 / columns)}% - 4px)`,
      }}
    >
      <button
        type="button"
        aria-label={t("info", { name: block.name })}
        className="absolute inset-0 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        onClick={() => {
          onSelect(block)
        }}
      />
      <div className="pointer-events-none relative flex min-w-0 flex-col gap-0.5 px-2 py-1">
        <span className="text-sm leading-tight font-medium break-words text-foreground">
          {block.name}
        </span>
        {minutes >= 60 && block.place ? (
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin
              aria-hidden
              className="size-3 shrink-0"
            />
            <span className="sr-only">{t("placeLabel")}: </span>
            <span className="truncate">{block.place}</span>
          </span>
        ) : null}
      </div>
    </article>
  )
}
