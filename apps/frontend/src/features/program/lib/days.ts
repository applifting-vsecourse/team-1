import { eachDayOfInterval, format, parseISO } from "date-fns"

import { currentLanguage, INTL_LOCALES } from "@/i18n"

import type { ProgramBlock } from "@/features/program/api/program"

/** cs: `Pondělí 12. 7. 2027`, en: `Monday, 12/07/2027` — the weekday starts with a capital. */
export function formatDay(isoDay: string): string {
  const text = new Intl.DateTimeFormat(INTL_LOCALES[currentLanguage()], {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(parseISO(isoDay))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** `10:00–12:00` */
export const timeRange = (block: { startTime: string; endTime: string }): string =>
  `${block.startTime}–${block.endTime}`

/** Every day of a term, as ISO days. */
export function daysOfTerm(term: { startsOn: string; endsOn: string }): string[] {
  return eachDayOfInterval({ start: parseISO(term.startsOn), end: parseISO(term.endsOn) }).map(
    (day) => format(day, "yyyy-MM-dd"),
  )
}

export type ProgramDay = { date: string; blocks: ProgramBlock[] }

/**
 * The days of the term with their blocks. With `shouldShowEmptyDays` (the organizer) every day of the
 * term is there, so a day without a block can be filled; a day outside the term that still has a
 * block is kept too, so nothing is hidden. The participant gets only days with a block.
 */
export function groupByDay(
  term: { startsOn: string; endsOn: string; blocks: ProgramBlock[] },
  shouldShowEmptyDays: boolean,
): ProgramDay[] {
  const days = new Map<string, ProgramBlock[]>()
  if (shouldShowEmptyDays) for (const date of daysOfTerm(term)) days.set(date, [])
  for (const block of term.blocks) days.set(block.date, [...(days.get(block.date) ?? []), block])
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, blocks]) => ({ date, blocks }))
}
