import { toMinutes } from "@/features/program/lib/calendar"
import { daysOfTerm } from "@/features/program/lib/days"

type Dated = { date: string; startTime: string; endTime: string; name: string }
type Term = { startsOn: string; endsOn: string }

/**
 * What copying the program of `source` into `target` does (the server decides the same way): day N goes
 * to day N, blocks of days the target does not have are skipped, and a copy that overlaps a kept or
 * another copied block is reported.
 */
export function previewCopy<T extends Dated>(
  source: Term & { blocks: T[] },
  target: Term,
  kept: Dated[],
): {
  copies: (T & { sourceDate: string })[]
  skipped: number
  skippedDays: number[]
  overlaps: { date: string; first: string; second: string }[]
} {
  const sourceDays = daysOfTerm(source)
  const targetDays = daysOfTerm(target)
  const copies: (T & { sourceDate: string })[] = []
  const skippedDays = new Set<number>()
  let skipped = 0
  for (const block of source.blocks) {
    const index = sourceDays.indexOf(block.date)
    const date = targetDays[index]
    if (index < 0 || !date) {
      skipped += 1
      skippedDays.add(index + 1)
      continue
    }
    copies.push({ ...block, sourceDate: block.date, date })
  }
  const overlaps: { date: string; first: string; second: string }[] = []
  copies.forEach((copy, i) => {
    for (const other of [...kept, ...copies.slice(i + 1)]) {
      if (
        other.date === copy.date &&
        toMinutes(copy.startTime) < toMinutes(other.endTime) &&
        toMinutes(other.startTime) < toMinutes(copy.endTime)
      ) {
        overlaps.push({ date: copy.date, first: copy.name, second: other.name })
      }
    }
  })
  return {
    copies,
    skipped,
    skippedDays: [...skippedDays].filter((day) => day > 0).sort((a, b) => a - b),
    overlaps,
  }
}
