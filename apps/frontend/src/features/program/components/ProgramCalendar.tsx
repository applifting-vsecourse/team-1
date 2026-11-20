import { MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ProgramBlock } from "@/features/program/api/program"
import { HOUR_HEIGHT, hourRange, placeBlocks, toMinutes } from "@/features/program/lib/calendar"
import { calendarDays, formatDayHeader } from "@/features/program/lib/days"

const DAY_MIN_WIDTH = 150

// Design: Figma (Design system) US-66 · O35 Program termínu (calendar) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23263-91745
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
  const columns = `var(--time-column) repeat(${String(days.length)}, minmax(0, 1fr))`

  // Shared time tracks can grow to fit a short block's name and touch target on every day.
  const boundaries = [
    ...new Set([
      ...hours.map((hour) => hour * 60),
      to * 60,
      ...term.blocks.flatMap((block) => [toMinutes(block.startTime), toMinutes(block.endTime)]),
    ]),
  ].sort((a, b) => a - b)
  const line = (minutes: number) => boundaries.indexOf(minutes) + 1
  const rows = boundaries
    .slice(1)
    .map((end, i) => `minmax(${((end - boundaries[i]!) * HOUR_HEIGHT) / 60}px, auto)`)
    .join(" ")
  return (
    <section
      aria-label={t("calendarLabel")}
      className="overflow-x-auto rounded-lg border bg-card"
    >
      <div
        className="[--time-column:3rem] md:[--time-column:3.5rem]"
        style={{ minWidth: `calc(var(--time-column) + ${String(days.length * DAY_MIN_WIDTH)}px)` }}
      >
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
                className="flex min-h-12 items-center gap-2 border-l px-3 text-sm"
              >
                <span className="font-medium">{header.weekday}</span>
                <span className="text-muted-foreground">{header.date}</span>
              </h2>
            )
          })}
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              aria-hidden
              className="pointer-events-none col-span-full border-t border-border"
              style={{ gridRow: line(hour * 60) }}
            />
          ))}
          <div
            aria-hidden
            className="sticky left-0 z-10 col-start-1 bg-card"
            style={{ gridRow: "1 / -1" }}
          />
          {hours.map((hour) => (
            <span
              key={hour}
              aria-hidden
              className="sticky left-0 z-20 col-start-1 self-start bg-card pr-2 text-right text-xs font-medium text-muted-foreground tabular-nums"
              style={{ gridRow: line(hour * 60) }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
          {days.map((day, index) => (
            <div
              key={day}
              className="grid min-w-0 grid-rows-subgrid border-l"
              style={{ gridColumn: index + 2, gridRow: "1 / -1" }}
            >
              {placeBlocks(term.blocks.filter((block) => block.date === day)).map((item) => (
                <CalendarBlock
                  key={item.block.id}
                  {...item}
                  gridRow={`${line(toMinutes(item.block.startTime))} / ${line(toMinutes(item.block.endTime))}`}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CalendarBlock({
  block,
  column,
  columns,
  gridRow,
  onSelect,
}: {
  block: ProgramBlock
  column: number
  columns: number
  gridRow: string
  onSelect: (block: ProgramBlock) => void
}) {
  const { t } = useTranslation("program")
  const start = toMinutes(block.startTime)
  const minutes = toMinutes(block.endTime) - start
  return (
    <article
      className="relative col-start-1 my-px min-h-11 min-w-0 rounded-checkbox border-l-4 border-l-primary bg-accent text-accent-foreground transition-colors hover:bg-accent/80"
      style={{
        gridRow,
        marginLeft: `calc(${String((column * 100) / columns)}% + 2px)`,
        width: `calc(${String(100 / columns)}% - 4px)`,
      }}
    >
      <button
        type="button"
        aria-label={t("info", { name: block.name })}
        className="absolute inset-0 rounded-checkbox outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
