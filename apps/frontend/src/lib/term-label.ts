import { formatDateRange } from "@/lib/date"

type TermDates = { startsOn: string; endsOn: string }

/** The term's name without the empty case: `null` for a term known by its dates only (D-053). */
export const termName = (term: { name: string | null }): string | null => {
  const name = term.name?.trim() ?? ""
  return name === "" ? null : name
}

/** The term's dates with the year — cs: `12.–18. 7. 2027`. */
export const termDates = (term: TermDates): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

/** Dates first, then the name when there is one — `12.–18. 7. 2027 · První turnus`. */
export const termDatesLine = (term: TermDates & { name: string | null }): string => {
  const name = termName(term)
  return name ? `${termDates(term)} · ${name}` : termDates(term)
}

/** A term with both — `První turnus · 12.–18. 7. 2027` — or just the dates without a name. */
export const termLine = (term: TermDates & { name: string | null }): string => {
  const name = termName(term)
  return name ? `${name} · ${termDates(term)}` : termDates(term)
}

/**
 * A term in a sentence, a label or a title: its name, or — a term needs no name — its dates.
 * The one place that decides; nothing composes this text on its own.
 */
export const termTitle = (term: TermDates & { name: string | null }): string =>
  termName(term) ?? termDates(term)
