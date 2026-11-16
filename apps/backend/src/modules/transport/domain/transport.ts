/** A ride with a place and time of departure, or "own transport": the participant gets there alone. */
export type TransportKind = "SCHEDULED" | "OWN"

/** The organizations are Czech: a departure counts for the calendar day of this zone. */
const TIME_ZONE = "Europe/Prague"

export type TransportInput = {
  /** Empty for own transport: the frontend translates it. */
  name: string
  departurePlace: string | null
  departureAt: Date | null
  /** Free text for the participant: address, where to park, what to bring. */
  instructions: string | null
}

export type TransportOption = TransportInput & { id: string; kind: TransportKind }

export type TransportSummary = TransportOption & {
  /** Participants with an active term of this transport that chose it. */
  participantsCount: number
}

export type TermInfo = {
  termId: string
  termName: string | null
  /** ISO dates, e.g. "2027-07-12". */
  startsOn: string
  endsOn: string
}

export type TermTransport = TermInfo & {
  transports: TransportSummary[]
}

export type EventTransport = {
  eventName: string
  terms: TermTransport[]
}

export type TransportParticipant = { applicationId: string; name: string; email: string }

export type TransportParticipants = TermInfo & {
  /** Empty for own transport (the frontend translates it). */
  name: string
  kind: TransportKind
  participants: TransportParticipant[]
}

export type ApplicationTransport = {
  participantName: string
  eventName: string
  terms: (TermInfo & {
    status: string
    selectedTransportId: string | null
    options: TransportOption[]
  })[]
}

/** The name `Adam Dvořák` of a participant, as in the lists. */
export const fullName = (firstName: string, lastName: string): string => `${firstName} ${lastName}`

/** The calendar day (`2027-07-12`) of an instant in Czech time. */
export function departureDay(departureAt: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(departureAt)
}

/** A bus must not leave after the last day of the term; the day itself is fine. */
export function isDepartureWithinTerm(departureAt: Date, termEndsOn: string): boolean {
  return departureDay(departureAt) <= termEndsOn
}

/**
 * What is stored for a transport of this kind: a ride needs a name, a place and a time (`null`
 * when one is missing), own transport keeps only the instructions.
 */
export function normalizeInput(
  kind: TransportKind,
  input: Partial<TransportInput>,
): TransportInput | null {
  const instructions = input.instructions?.trim() || null
  if (kind === "OWN") return { name: "", departurePlace: null, departureAt: null, instructions }
  const { name, departurePlace, departureAt } = input
  if (!name || !departurePlace || !departureAt) return null
  return { name, departurePlace, departureAt, instructions }
}
