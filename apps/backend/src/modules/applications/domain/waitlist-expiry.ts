/**
 * An application on the waitlist is cancelled by the system on the first day of its term
 * (state diagram of an application in a term, both evaluation modes; US-106).
 *
 * The documents do not name a time zone. A term starts on a calendar date (`Term.startsOn`,
 * a date without time) and the organizations and applicants are Czech, so "the first day"
 * begins at midnight Europe/Prague, not UTC.
 */
export const EXPIRY_TIME_ZONE = "Europe/Prague"

/** The calendar date `now` falls on in Prague, as a date at UTC midnight (how `startsOn` is stored). */
export function todayInPrague(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EXPIRY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  return new Date(`${parts}T00:00:00.000Z`)
}

/**
 * True from the first day of the term onwards, so a run that was missed (downtime) still
 * catches up and running twice changes nothing.
 */
export function isWaitlistExpired(startsOn: Date, now: Date): boolean {
  return startsOn.getTime() <= todayInPrague(now).getTime()
}
