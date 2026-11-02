export type PublicTerm = {
  id: string
  name: string | null
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

export type MissingForApplications = "TERM" | "ROOM"

/**
 * What an event still lacks before its application link works: at least one
 * term (every term has a price, `Term.priceCzk`) and at least one room in
 * every term, which gives the term its capacity (docs/PROJEKT.md, section 5,
 * D-052). "ROOM" means some term has no room yet.
 */
export function missingForApplications(counts: {
  termCount: number
  termsWithoutRooms: number
}): MissingForApplications[] {
  const missing: MissingForApplications[] = []
  if (counts.termCount === 0) missing.push("TERM")
  if (counts.termsWithoutRooms > 0) missing.push("ROOM")
  return missing
}

/**
 * The application link works once the event has at least one term and every
 * term has a price and at least one room (docs/PROJEKT.md, section 5). Until
 * then it answers like an unknown link; adding a term without rooms closes it
 * again.
 */
export function isOpenForApplications(counts: {
  termCount: number
  termsWithoutRooms: number
}): boolean {
  return missingForApplications(counts).length === 0
}

/** The same check over loaded terms: how many there are and how many have no room. */
export function isOpenForTerms(terms: { roomCount: number }[]): boolean {
  return isOpenForApplications({
    termCount: terms.length,
    termsWithoutRooms: terms.filter((term) => term.roomCount === 0).length,
  })
}
