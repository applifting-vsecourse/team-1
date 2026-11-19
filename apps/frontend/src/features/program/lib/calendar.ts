/** Height of one hour in the calendar, px. */
export const HOUR_HEIGHT = 48

const DEFAULT_FROM = 7
const DEFAULT_TO = 18
/** A block ending after the default end draws the calendar to midnight. */
const LATE_TO = 24

type Timed = { startTime: string; endTime: string }

/** `09:30` → 570 */
export function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/** The hours shown: 7:00–18:00; to midnight when a block ends later, earlier start when one starts earlier. */
export function hourRange(blocks: Timed[]): { from: number; to: number } {
  let from = DEFAULT_FROM
  let to = DEFAULT_TO
  for (const block of blocks) {
    from = Math.min(from, Math.floor(toMinutes(block.startTime) / 60))
    if (toMinutes(block.endTime) > DEFAULT_TO * 60) to = LATE_TO
  }
  return { from, to }
}

export type PlacedBlock<T extends Timed> = {
  block: T
  /** Column among the blocks it overlaps with, from 0. */
  column: number
  /** How many columns the overlapping group needs. */
  columns: number
}

/** Blocks of one day that overlap in time sit side by side; the rest take the full width. */
export function placeBlocks<T extends Timed>(blocks: T[]): PlacedBlock<T>[] {
  const sorted = [...blocks].sort(
    (a, b) =>
      toMinutes(a.startTime) - toMinutes(b.startTime) ||
      toMinutes(a.endTime) - toMinutes(b.endTime),
  )
  const placed: PlacedBlock<T>[] = []
  let group: PlacedBlock<T>[] = []
  let columnEnds: number[] = []
  let groupEnd = 0
  const closeGroup = () => {
    for (const item of group) item.columns = columnEnds.length
    placed.push(...group)
    group = []
    columnEnds = []
  }
  for (const block of sorted) {
    const start = toMinutes(block.startTime)
    if (group.length && start >= groupEnd) closeGroup()
    let column = columnEnds.findIndex((end) => end <= start)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = toMinutes(block.endTime)
    groupEnd = Math.max(groupEnd, toMinutes(block.endTime))
    group.push({ block, column, columns: 1 })
  }
  closeGroup()
  return placed
}

/** Blocks of the same day whose time overlaps `start`–`end`; `exceptId` leaves out the block being edited. */
export function overlapping<T extends Timed & { id: string; date: string }>(
  blocks: T[],
  candidate: { date: string; startTime: string; endTime: string },
  exceptId?: string,
): T[] {
  const start = toMinutes(candidate.startTime)
  const end = toMinutes(candidate.endTime)
  return blocks.filter(
    (block) =>
      block.id !== exceptId &&
      block.date === candidate.date &&
      toMinutes(block.startTime) < end &&
      start < toMinutes(block.endTime),
  )
}

/**
 * Of the overlaps a copy reported (pairs of block names on a day), the ones that still exist in the
 * current blocks. The copy result is a snapshot, so the warning is re-checked after every block change.
 */
export function remainingOverlaps<
  T extends Timed & { date: string; name: string },
  O extends { date: string; first: string; second: string },
>(reported: O[], blocks: T[]): O[] {
  return reported.filter((item) => {
    const day = blocks.filter((block) => block.date === item.date)
    return day.some(
      (first) =>
        first.name === item.first &&
        day.some(
          (second) =>
            second !== first &&
            second.name === item.second &&
            toMinutes(first.startTime) < toMinutes(second.endTime) &&
            toMinutes(second.startTime) < toMinutes(first.endTime),
        ),
    )
  })
}
