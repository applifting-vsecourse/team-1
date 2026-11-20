import { useRef, type KeyboardEvent } from "react"
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { GripVertical, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { Button } from "@/components/ui/button"

import type { ProgramBlock } from "@/features/program/api/program"
import { HOUR_HEIGHT, hourRange, placeBlocks, toMinutes } from "@/features/program/lib/calendar"
import { calendarDays, formatDayHeader, timeRange } from "@/features/program/lib/days"

import { ProgramDayColumn, useProgramDrag } from "./ProgramDrag"

const DAY_MIN_WIDTH = 150

// Design: Figma (Design system) US-66 · O35 Program termínu (calendar) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23263-91745
/**
 * The program of a term as a calendar: a column per day of the term, hours down the side and every
 * block drawn over its time span with its full name. A click on a block opens its details (`onSelect`).
 */
export function ProgramCalendar({
  term,
  onSelect,
  onMove,
  isSaving = false,
}: {
  onMove?: (block: ProgramBlock) => void
  isSaving?: boolean
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
  const grid = useRef<HTMLDivElement>(null)
  const drag = useProgramDrag(term, days, boundaries, grid, onMove)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const conflictNames = drag.conflicts
    .map(({ name, minutes }) => t("move.overlap", { name, count: minutes }))
    .join(" ")
  const calendar = (
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
          ref={grid}
          className="relative grid"
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
            <ProgramDayColumn
              key={day}
              date={day}
              index={index}
              isReadOnly={!onMove || day < term.startsOn || day > term.endsOn}
            >
              {placeBlocks(term.blocks.filter((block) => block.date === day)).map((item) => (
                <CalendarBlock
                  key={item.block.id}
                  {...item}
                  gridRow={`${line(toMinutes(item.block.startTime))} / ${line(toMinutes(item.block.endTime))}`}
                  onSelect={onSelect}
                  onMoveKeyDown={onMove && drag.keyDown}
                  isSaving={isSaving}
                  isSource={drag.preview?.id === item.block.id}
                />
              ))}
              {drag.preview?.date === day && (
                <div
                  aria-hidden
                  data-program-preview
                  data-status="active"
                  style={drag.previewStyle()}
                  className={`group pointer-events-none absolute inset-x-0.5 z-20 flex min-h-11 flex-col justify-center overflow-hidden rounded-lg border px-3 text-sm ${conflictNames ? "border-destructive bg-card text-destructive" : "border-border bg-accent text-accent-foreground opacity-[.92]"}`}
                >
                  <span className="truncate font-medium">{drag.preview.name}</span>
                  <span className="text-xs">{timeRange(drag.preview)}</span>
                  {!conflictNames && <ActiveCorners />}
                </div>
              )}
            </ProgramDayColumn>
          ))}
        </div>
      </div>
    </section>
  )
  if (!onMove) return calendar
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{
        screenReaderInstructions: { draggable: t("move.instructions") },
        announcements: {
          onDragStart: () => undefined,
          onDragOver: () => undefined,
          onDragEnd: () => undefined,
          onDragCancel: () => undefined,
        },
      }}
      onDragStart={({ active }) => drag.pointerStart(active.id)}
      onDragMove={drag.pointerMove}
      onDragOver={drag.pointerMove}
      onDragEnd={drag.pointerEnd}
      onDragCancel={drag.cancel}
    >
      {calendar}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          drag.preview
            ? `text-sm ${conflictNames ? "text-destructive" : "text-muted-foreground"}`
            : "sr-only"
        }
      >
        {drag.preview &&
          (conflictNames
            ? drag.message + " " + conflictNames
            : drag.message + " " + t("move.hint"))}
      </p>
    </DndContext>
  )
}

function CalendarBlock({
  block,
  column,
  columns,
  gridRow,
  onSelect,
  onMoveKeyDown,
  isSaving,
  isSource,
}: {
  block: ProgramBlock
  column: number
  columns: number
  onMoveKeyDown?: (event: KeyboardEvent<HTMLButtonElement>, block: ProgramBlock) => void
  isSaving: boolean
  isSource?: boolean
  gridRow: string
  onSelect: (block: ProgramBlock) => void
}) {
  const { t } = useTranslation("program")
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: block.id,
    disabled: !onMoveKeyDown || isSaving,
  })
  const start = toMinutes(block.startTime)
  const minutes = toMinutes(block.endTime) - start
  return (
    <article
      ref={setNodeRef}
      data-moving={isSource}
      className="relative col-start-1 my-px min-h-11 min-w-0 rounded-checkbox border-l-4 border-l-primary bg-accent text-accent-foreground transition-colors hover:bg-accent/80 data-[moving=true]:opacity-40"
      style={{
        gridRow,
        marginLeft: `calc(${String((column * 100) / columns)}% + 2px)`,
        width: `calc(${String(100 / columns)}% - 4px)`,
      }}
    >
      <Button
        type="button"
        variant="ghost"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") listeners?.onPointerDown?.(event)
        }}
        aria-label={t("info", { name: block.name })}
        className="absolute inset-0 size-full rounded-checkbox p-0 focus-visible:-outline-offset-2"
        onClick={() => {
          onSelect(block)
        }}
      />
      {onMoveKeyDown && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={isSaving}
          data-program-move={block.id}
          aria-label={t("move.label", { name: block.name })}
          aria-pressed={isSource}
          onKeyDown={(event) => onMoveKeyDown(event, block)}
          className="absolute top-0 right-0 z-10 cursor-grab touch-none rounded-checkbox text-primary focus-visible:-outline-offset-2 active:cursor-grabbing"
        >
          <GripVertical
            aria-hidden
            className="size-4"
          />
        </Button>
      )}
      <div
        className={`pointer-events-none relative flex min-w-0 flex-col gap-0.5 px-2 py-1 ${onMoveKeyDown ? "pr-10" : ""}`}
      >
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
