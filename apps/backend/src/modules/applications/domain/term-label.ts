import { Locale } from "@/core/email/locale"

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

type Day = { year: number; month: number; day: number }

/** `2027-07-04` or a Date from a `@db.Date` column (UTC midnight). */
function toDay(value: string | Date): Day {
  const iso = typeof value === "string" ? value : value.toISOString()
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return { year, month, day }
}

/** A run of days with the year — cs: `12.–18. 7. 2027`, en: `12–18 Jul 2027`. */
export function formatTermDates(
  startsOn: string | Date,
  endsOn: string | Date,
  locale: Locale,
): string {
  const a = toDay(startsOn)
  const b = toDay(endsOn)
  const isSameYear = a.year === b.year
  const isSameMonth = isSameYear && a.month === b.month

  if (locale === "cs") {
    const dayMonth = (d: Day) => `${d.day}. ${d.month}.`
    if (isSameMonth) return `${a.day}.–${b.day}. ${b.month}. ${b.year}`
    if (isSameYear) return `${dayMonth(a)} – ${dayMonth(b)} ${b.year}`
    return `${dayMonth(a)} ${a.year} – ${dayMonth(b)} ${b.year}`
  }

  const dayMonth = (d: Day) => `${d.day} ${EN_MONTHS[d.month - 1]}`
  if (isSameMonth) return `${a.day}–${dayMonth(b)} ${b.year}`
  if (isSameYear) return `${dayMonth(a)} – ${dayMonth(b)} ${b.year}`
  return `${dayMonth(a)} ${a.year} – ${dayMonth(b)} ${b.year}`
}

/**
 * A term in a sentence (e-mail, error message): its name, or — a term needs no name,
 * D-053 — its dates. The one place that decides; nothing composes this text on its own.
 */
export function termLabel(
  term: { name: string | null; startsOn: string | Date; endsOn: string | Date },
  locale: Locale,
): string {
  return term.name?.trim() || formatTermDates(term.startsOn, term.endsOn, locale)
}
