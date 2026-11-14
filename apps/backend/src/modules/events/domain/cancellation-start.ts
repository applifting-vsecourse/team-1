/** A real ISO calendar day, independent of server timezone and time of day. */
export function isValidCancellationStart(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** The start day itself already requires organizer approval. Dates are Prague calendar days. */
export function canChangeImmediately(startsOn: Date | null, today: Date): boolean {
  return startsOn === null || today.getTime() < startsOn.getTime()
}

/**
 * Cancellation rules cannot be introduced retroactively: a new or changed start day may not be
 * before today. Clearing the date and re-saving the unchanged one (even when it has passed
 * meanwhile) stay allowed. `today` is the Prague calendar day as `yyyy-MM-dd`.
 */
export function isCancellationStartAllowed(
  next: string | null,
  current: string | null,
  today: string,
): boolean {
  return next === null || next === current || next >= today
}
