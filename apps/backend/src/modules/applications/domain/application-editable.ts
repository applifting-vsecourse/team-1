/**
 * Whether the details of an application can still be edited (D-141): while it has a term that is
 * not cancelled and has not ended (its last day still counts as running). An application whose
 * terms are all cancelled or over is history. One rule for the applicant, the organizer and the
 * organizer detail that shows the button.
 */
export function isApplicationEditable(
  terms: { status: string; endsOn: Date }[],
  /** The calendar day in Prague at UTC midnight, see `todayInPrague`. */
  today: Date,
): boolean {
  return terms.some((term) => term.status !== "CANCELLED" && term.endsOn >= today)
}
