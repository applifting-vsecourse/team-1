import type { Language } from "@/i18n"

/**
 * A calendar day typed into or shown in a date field. The value of a field is
 * always an ISO day (`2014-05-18`); only what the user sees depends on the
 * language. Everything here works on the year / month / day numbers and never
 * goes through a `Date` in UTC, so no time zone can shift the day.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_FIRST = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})$/

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const daysInMonth = (year: number, month: number) =>
  month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31

const toIso = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

/** The ISO day for these numbers, or `null` when it is not a real day (`31. 2.`). */
function build(year: number, month: number, day: number): string | null {
  const isRealDay =
    year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  return isRealDay ? toIso(year, month, day) : null
}

/** `true` for a real day written as `yyyy-MM-dd`. */
export function isIsoDate(text: string): boolean {
  const match = ISO_DATE.exec(text)
  return match ? build(Number(match[1]), Number(match[2]), Number(match[3])) === text : false
}

/**
 * What a user typed → ISO `2014-05-18`, or `null` when it is not a real day
 * (empty, incomplete, `31. 2. 2014`). Day first, separated by dots, slashes or
 * dashes, with or without spaces and leading zeros — `18. 5. 2014`,
 * `18.5.2014`, `18/05/2014`; a pasted ISO day is accepted too.
 */
export function parseDateInput(text: string): string | null {
  const value = text.trim()
  if (isIsoDate(value)) return value
  const match = DAY_FIRST.exec(value)
  return match ? build(Number(match[3]), Number(match[2]), Number(match[1])) : null
}

/** ISO day → what the field shows — cs: `18. 5. 2014`, en: `18/05/2014`. */
export function formatDateInput(iso: string, language: Language): string {
  const match = ISO_DATE.exec(iso)
  if (!match) return iso
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return language === "cs"
    ? `${day}. ${month}. ${year}`
    : `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${match[1]}`
}

/** ISO day → a `Date` at local midnight of that day (for the calendar). */
export function isoToLocalDate(iso: string): Date | undefined {
  if (!isIsoDate(iso)) return undefined
  const date = new Date(2000, 0, 1)
  date.setFullYear(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
  return date
}

/** A `Date` (its local day) → ISO day. */
export function localDateToIso(date: Date): string {
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate())
}
