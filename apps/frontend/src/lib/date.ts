import { parseISO } from "date-fns"

import { currentLanguage, INTL_LOCALES, type Language } from "@/i18n"

type DateInput = string | number | Date

const toDate = (date: DateInput) => (typeof date === "string" ? parseISO(date) : date)

/** cs: `7. 2. 2027`, en: `7 Feb 2027` */
export function formatDate(date: DateInput, language: Language = currentLanguage()) {
  return new Intl.DateTimeFormat(INTL_LOCALES[language], { dateStyle: "medium" }).format(
    toDate(date),
  )
}

/** cs: `7. 2. 2027 20:00`, en: `7 Feb 2027, 20:00` */
export function formatDateTime(date: DateInput, language: Language = currentLanguage()) {
  return new Intl.DateTimeFormat(INTL_LOCALES[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(toDate(date))
}

type RangeOptions = {
  /** Append the year (of the end date). */
  shouldShowYear?: boolean
  language?: Language
}

const asDate = (date: DateInput) => new Date(toDate(date))

const monthName = (date: Date, style: "short" | "long", language: Language) =>
  new Intl.DateTimeFormat(INTL_LOCALES[language], { month: style }).format(date)

/**
 * A run of days, as in the price list — cs: `12.–18. 7. 2027`, en: `12–18 Jul 2027`.
 * Without the year: `12.–18. 7.` / `12–18 Jul`.
 */
export function formatDateRange(
  start: DateInput,
  end: DateInput,
  { shouldShowYear = false, language = currentLanguage() }: RangeOptions = {},
) {
  const a = asDate(start)
  const b = asDate(end)
  const isSameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  const isSameYear = a.getFullYear() === b.getFullYear()
  const year = shouldShowYear ? ` ${b.getFullYear()}` : ""

  if (language === "cs") {
    const dayMonth = (date: Date) => `${date.getDate()}. ${date.getMonth() + 1}.`
    if (isSameMonth) return `${a.getDate()}.–${b.getDate()}. ${b.getMonth() + 1}.${year}`
    if (isSameYear || !shouldShowYear) return `${dayMonth(a)} – ${dayMonth(b)}${year}`
    return `${dayMonth(a)} ${a.getFullYear()} – ${dayMonth(b)}${year}`
  }

  const dayMonth = (date: Date) => `${date.getDate()} ${monthName(date, "short", language)}`
  if (isSameMonth) return `${a.getDate()}–${dayMonth(b)}${year}`
  if (isSameYear || !shouldShowYear) return `${dayMonth(a)} – ${dayMonth(b)}${year}`
  return `${dayMonth(a)} ${a.getFullYear()} – ${dayMonth(b)}${year}`
}

/** The months an event spans — cs: `červenec–srpen 2027`, en: `July–August 2027`. */
export function formatMonthRange(
  start: DateInput,
  end: DateInput,
  language: Language = currentLanguage(),
) {
  const a = asDate(start)
  const b = asDate(end)
  const first = monthName(a, "long", language)
  const last = monthName(b, "long", language)

  if (a.getFullYear() === b.getFullYear()) {
    return first === last ? `${first} ${b.getFullYear()}` : `${first}–${last} ${b.getFullYear()}`
  }
  return `${first} ${a.getFullYear()}–${last} ${b.getFullYear()}`
}
