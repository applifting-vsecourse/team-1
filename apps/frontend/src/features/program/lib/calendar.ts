/** Height of one hour in the calendar, px. */
export const HOUR_HEIGHT = 64

const DEFAULT_FROM = 7
const DEFAULT_TO = 21

type Timed = { startTime: string; endTime: string }

/** `09:30` → 570 */
export function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/** The hours shown: 7:00–21:00, wider when a block starts earlier or ends later. */
export function hourRange(blocks: Timed[]): { from: number; to: number } {
  let from = DEFAULT_FROM
  let to = DEFAULT_TO
  for (const block of blocks) {
    from = Math.min(from, Math.floor(toMinutes(block.startTime) / 60))
    to = Math.max(to, Math.ceil(toMinutes(block.endTime) / 60))
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
