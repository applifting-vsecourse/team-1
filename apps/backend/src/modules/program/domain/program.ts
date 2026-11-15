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
