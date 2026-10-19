export type PublicTerm = {
  id: string
  name: string
  /** ISO date, `2027-07-04`. */
  startsOn: string
  endsOn: string
  priceCzk: number
}

/** What an applicant sees on the public form — nothing about the organization's internals. */
export type PublicEvent = {
  name: string
  description: string | null
  location: string | null
  terms: PublicTerm[]
}

/**
 * The application link works once the event has at least one term (every term
 * has a price) and at least one room (docs/PROJEKT.md, section 5). Until then
 * it answers like an unknown link.
 */
export function isOpenForApplications(counts: { termCount: number; roomCount: number }): boolean {
  return counts.termCount > 0 && counts.roomCount > 0
}
