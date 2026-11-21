/** Wall-clock "HH:mm", zero-padded, so comparing the text compares the time. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export type TermInfo = {
  termId: string
  termName: string | null
  /** ISO dates, e.g. "2027-07-12". */
  startsOn: string
  endsOn: string
}

export type ProgramInput = {
  /** ISO day, e.g. "2027-07-13". */
  date: string
  startTime: string
  endTime: string
  name: string
  place: string | null
  description: string | null
}

export type ProgramBlock = ProgramInput & { id: string }

export type TermProgram = TermInfo & { blocks: ProgramBlock[] }

export type EventProgram = { eventName: string; terms: TermProgram[] }

export type ApplicationProgram = {
  participantName: string
  eventName: string
  /** Only the terms the participant is confirmed in. */
  terms: TermProgram[]
}

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const isRealDay = (value: string): boolean => {
  if (!DAY.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Trims the text and checks the shape; `null` when the input is not a valid block. */
export function normalizeInput(raw: Partial<ProgramInput>): ProgramInput | null {
  const name = raw.name?.trim()
  if (!name || name.length > 100) return null
  if (!raw.date || !isRealDay(raw.date)) return null
  if (!raw.startTime || !TIME.test(raw.startTime)) return null
  if (!raw.endTime || !TIME.test(raw.endTime)) return null
  const place = blankToNull(raw.place)
  const description = blankToNull(raw.description)
  if ((place?.length ?? 0) > 200 || (description?.length ?? 0) > 2000) return null
  return {
    date: raw.date,
    startTime: raw.startTime,
    endTime: raw.endTime,
    name,
    place,
    description,
  }
}

/** A block ends after it starts. */
export const isEndAfterStart = (startTime: string, endTime: string): boolean => endTime > startTime

/** ISO days compare as text. */
export const isDayWithinTerm = (
  date: string,
  term: { startsOn: string; endsOn: string },
): boolean => date >= term.startsOn && date <= term.endsOn

/** What a copy does with the blocks the target term already has: keep them and add, or remove them first. */
export type ProgramCopyStrategy = "ADD" | "REPLACE"

/** Two blocks of the same day whose time overlaps (touching ends do not count). */
export type ProgramOverlap = {
  date: string
  first: string
  second: string
  startTime: string
  endTime: string
}

export type ProgramCopyPlan = {
  /** Copies for the target term, shifted to its days. */
  blocks: ProgramInput[]
  /** Source blocks from days the target term does not have. */
  skipped: number
  overlaps: ProgramOverlap[]
}

const DAY_MS = 24 * 60 * 60 * 1000

const dayIndex = (date: string, startsOn: string): number =>
  Math.round(
    (Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${startsOn}T00:00:00.000Z`)) / DAY_MS,
  )

const shiftDay = (startsOn: string, index: number): string =>
  new Date(Date.parse(`${startsOn}T00:00:00.000Z`) + index * DAY_MS).toISOString().slice(0, 10)

const overlaps = (a: ProgramInput, b: ProgramInput): boolean =>
  a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime

/**
 * Day N of the source goes to day N of the target (1st to 1st); blocks of days the target does not have
 * are skipped and counted. `kept` are the target's blocks that survive (none on a replace); an overlap
 * is reported for every pair with at least one copied block, and does not stop the copy (D-123).
 */
export function planProgramCopy(
  source: { term: Pick<TermInfo, "startsOn" | "endsOn">; blocks: ProgramInput[] },
  target: Pick<TermInfo, "startsOn" | "endsOn">,
  kept: ProgramInput[],
): ProgramCopyPlan {
  const targetDays = dayIndex(target.endsOn, target.startsOn) + 1
  const blocks: ProgramInput[] = []
  let skipped = 0
  for (const block of source.blocks) {
    const index = dayIndex(block.date, source.term.startsOn)
    if (index < 0 || index >= targetDays) {
      skipped += 1
      continue
    }
    blocks.push({ ...block, date: shiftDay(target.startsOn, index) })
  }
  const found: ProgramOverlap[] = []
  blocks.forEach((copy, i) => {
    for (const other of [...kept, ...blocks.slice(i + 1)]) {
      if (overlaps(copy, other))
        found.push({
          date: copy.date,
          first: copy.name,
          second: other.name,
          startTime: copy.startTime > other.startTime ? copy.startTime : other.startTime,
          endTime: copy.endTime < other.endTime ? copy.endTime : other.endTime,
        })
    }
  })
  return { blocks, skipped, overlaps: found }
}
