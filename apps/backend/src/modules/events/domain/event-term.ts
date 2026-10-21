/** A term of an event as the organizer sees it (US-13). Dates are ISO `2027-07-04`. */
export type EventTerm = {
  id: string
  eventId: string
  name: string
  startsOn: string
  endsOn: string
  priceCzk: number
  /** Beds of the event's rooms, the same for every term (US-26). */
  capacity: number
  confirmedCount: number
  waitlistedCount: number
  cancelledAt: Date | null
  cancelReason: string | null
}

export type TermInput = {
  name: string
  startsOn: string
  endsOn: string
  priceCzk: number
}

/** The end may be the start day (a one-day term), but never earlier. ISO dates compare as text. */
export function isValidTermPeriod(startsOn: string, endsOn: string): boolean {
  // `2027-13-01` matches the pattern but is an Invalid Date, whose toISOString() throws.
  const isDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  return isDate(startsOn) && isDate(endsOn) && endsOn >= startsOn
}

/** Chronological order: by start, then end, then name. */
export function sortTerms<T extends Pick<EventTerm, "startsOn" | "endsOn" | "name">>(
  terms: T[],
): T[] {
  return [...terms].sort(
    (a, b) =>
      a.startsOn.localeCompare(b.startsOn) ||
      a.endsOn.localeCompare(b.endsOn) ||
      a.name.localeCompare(b.name),
  )
}
