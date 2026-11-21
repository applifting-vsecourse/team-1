import { useState, type KeyboardEvent, type ReactNode, type RefObject } from "react"
import { useDroppable, type DragEndEvent } from "@dnd-kit/core"
import { useTranslation } from "react-i18next"

import type { ProgramBlock, TermProgram } from "@/features/program/api/program"
import { overlapping, toMinutes } from "@/features/program/lib/calendar"
import { formatDay, timeRange } from "@/features/program/lib/days"

// Design: Program timeline · Dragging and collision · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15222-4590
const STEP = 30
const clockTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

// Short activities can expand their CSS grid track. Interpolate between the rendered
// track edges instead of assuming every pixel represents the same number of minutes.
function interpolate(value: number, from: number[], to: number[]) {
  const last = from.length - 1
  if (value >= from[last]!) return to[last]!
  const end = from.findIndex((edge) => edge > value)
  if (end < 1) return to[0]!
  const part = (value - from[end - 1]!) / (from[end]! - from[end - 1]!)
  return to[end - 1]! + part * (to[end]! - to[end - 1]!)
}

type Move = { id: string; date: string; start: number }

export function useProgramDrag(
  term: Pick<TermProgram, "startsOn" | "endsOn" | "blocks">,
  days: string[],
  boundaries: number[],
  grid: RefObject<HTMLDivElement | null>,
  onMove?: (block: ProgramBlock) => void,
) {
  const { t } = useTranslation("program")
  const [trackEdges, setTrackEdges] = useState<number[]>([])
  const [move, setMove] = useState<Move | null>(null)
  const block = term.blocks.find((item) => item.id === move?.id)
  const destination = (item: ProgramBlock, date: string, start: number): Move => {
    const duration = toMinutes(item.endTime) - toMinutes(item.startTime)
    const latestEnd = Math.min(1439, boundaries[boundaries.length - 1]!)
    return {
      id: item.id,
      date,
      start: Math.max(boundaries[0]!, Math.min(latestEnd - duration, start)),
    }
  }
  function target(item: ProgramBlock, next: Move): ProgramBlock {
    const end = next.start + toMinutes(item.endTime) - toMinutes(item.startTime)
    return { ...item, date: next.date, startTime: clockTime(next.start), endTime: clockTime(end) }
  }
  const preview = block && move ? target(block, move) : null
  const conflicts = preview
    ? overlapping(term.blocks, preview, preview.id).map((other) => ({
        name: other.name,
        minutes:
          Math.min(toMinutes(preview.endTime), toMinutes(other.endTime)) -
          Math.max(toMinutes(preview.startTime), toMinutes(other.startTime)),
      }))
    : []
  function rows() {
    if (!grid.current) return []
    const sizes = getComputedStyle(grid.current).gridTemplateRows.split(" ").map(Number.parseFloat)
    const offsets = [0]
    for (const size of sizes) offsets.push(offsets[offsets.length - 1]! + size)
    return offsets
  }
  function pointer(event: DragEndEvent) {
    const date = event.over?.id
    const item = term.blocks.find((b) => b.id === event.active.id)
    if (!item || typeof date !== "string" || date < term.startsOn || date > term.endsOn) return null
    const offsets = rows()
    if (offsets.length !== boundaries.length) return null
    const start = toMinutes(item.startTime)
    const y = interpolate(start, boundaries, offsets) + event.delta.y
    const change = interpolate(y, offsets, boundaries) - start
    return destination(item, date, start + Math.round(change / STEP) * STEP)
  }
  function finish(next: Move | null) {
    setMove(null)
    const item = term.blocks.find((b) => b.id === next?.id)
    if (item && next && (next.date !== item.date || next.start !== toMinutes(item.startTime))) {
      onMove?.(target(item, next))
    }
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, item: ProgramBlock) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (move?.id === item.id) finish(move)
      else {
        setTrackEdges(rows())
        setMove({ id: item.id, date: item.date, start: toMinutes(item.startTime) })
      }
      return
    }
    if (item.id !== move?.id) return
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault()
      setMove(null)
      return
    }
    const index = days.indexOf(move.date)
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const isHorizontal = event.key === "ArrowLeft" || event.key === "ArrowRight"
    const date = isHorizontal ? days[index + direction] : move.date
    if (date && date >= term.startsOn && date <= term.endsOn) {
      setMove(destination(item, date, move.start + (isHorizontal ? 0 : direction * STEP)))
      requestAnimationFrame(() => {
        grid.current
          ?.querySelector("[data-program-preview]")
          ?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
      })
    }
  }
  const message = preview
    ? t("move.position", {
        name: preview.name,
        date: formatDay(preview.date),
        time: timeRange(preview),
      })
    : ""
  return {
    preview,
    conflicts,
    message,
    keyDown,
    cancel: () => setMove(null),
    pointerMove: (event: DragEndEvent) => setMove(pointer(event)),
    pointerEnd: (event: DragEndEvent) => finish(pointer(event)),
    pointerStart: (id: string | number) => {
      const item = term.blocks.find((b) => b.id === id)
      setTrackEdges(rows())
      if (item) setMove({ id: item.id, date: item.date, start: toMinutes(item.startTime) })
    },
    // Grid rows come from the original program. Previewing never shifts the drop targets.
    previewStyle: () => {
      if (!preview) return {}
      const offsets = trackEdges
      if (offsets.length !== boundaries.length) return {}
      const top = interpolate(toMinutes(preview.startTime), boundaries, offsets)
      return { top, height: interpolate(toMinutes(preview.endTime), boundaries, offsets) - top }
    },
  }
}

export function ProgramDayColumn({
  date,
  index,
  children,
  isReadOnly,
}: {
  date: string
  index: number
  children: ReactNode
  isReadOnly: boolean
}) {
  const { setNodeRef } = useDroppable({ id: date, disabled: isReadOnly })
  return (
    <div
      ref={setNodeRef}
      data-program-day={date}
      className="relative grid min-w-0 grid-rows-subgrid border-l"
      style={{ gridColumn: index + 2, gridRow: "1 / -1" }}
    >
      {children}
    </div>
  )
}
