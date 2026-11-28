/**
 * The last day an arrangement of a term (transport, meals) can be changed (D-192): the term's
 * last day still counts, the day after it the application is archived. One rule for the
 * applicant, the organizer and the screens that show the actions; it goes by the date, not by the
 * `ARCHIVED` status, because an unpaid term that is over is never archived.
 */
export function isEditWindowOpen(
  termEndsOn: Date,
  /** The calendar day in Prague at UTC midnight, see `todayInPrague`. */
  today: Date,
): boolean {
  return termEndsOn >= today
}

/** A term that has not been cancelled (itself or the application in it) and is not over. */
export function isTermEditable(
  term: { status: string; endsOn: Date; cancelledAt?: Date | null },
  today: Date,
): boolean {
  return term.status !== "CANCELLED" && !term.cancelledAt && isEditWindowOpen(term.endsOn, today)
}

/**
 * Meals are stored once for the whole application, so they can be changed until the last term
 * that is not cancelled is over. Same rule as editing the details (D-141).
 */
export function isMealsEditable(
  terms: { status: string; endsOn: Date; cancelledAt?: Date | null }[],
  today: Date,
): boolean {
  return terms.some((term) => isTermEditable(term, today))
}
