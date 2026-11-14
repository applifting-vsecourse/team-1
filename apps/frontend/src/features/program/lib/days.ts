import { eachDayOfInterval, format, parseISO } from "date-fns"

import { currentLanguage, INTL_LOCALES } from "@/i18n"

import { toMinutes } from "@/features/program/lib/calendar"

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

/** `2 h 30 min`, `45 min`, `3 h` */
export function formatDuration(block: { startTime: string; endTime: string }): string {
  const minutes = toMinutes(block.endTime) - toMinutes(block.startTime)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return [hours ? `${String(hours)} h` : "", rest ? `${String(rest)} min` : ""]
    .filter(Boolean)
    .join(" ")
}

/** Every day of a term, as ISO days. */
export function daysOfTerm(term: { startsOn: string; endsOn: string }): string[] {
  return eachDayOfInterval({ start: parseISO(term.startsOn), end: parseISO(term.endsOn) }).map(
    (day) => format(day, "yyyy-MM-dd"),
  )
}

/** The columns of the calendar: every day of the term, plus a day outside it that still has a block, so nothing is hidden. */
export function calendarDays(term: {
  startsOn: string
  endsOn: string
  blocks: { date: string }[]
}): string[] {
  const days = new Set(daysOfTerm(term))
  for (const block of term.blocks) days.add(block.date)
  return [...days].sort((a, b) => a.localeCompare(b))
}

/** Column header of a day: `Mon` and `12/07`. */
export function formatDayHeader(isoDay: string): { weekday: string; date: string } {
  const locale = INTL_LOCALES[currentLanguage()]
  const day = parseISO(isoDay)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" }).format(day),
  }
}
