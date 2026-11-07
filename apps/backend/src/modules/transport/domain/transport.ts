/** Pseudo id of "own transport" in URLs and requests: no transport, the participant gets there alone. */
export const OWN_TRANSPORT_ID = "own"

/** The organizations are Czech: a departure counts for the calendar day of this zone. */
const TIME_ZONE = "Europe/Prague"

export type TransportInput = {
  name: string
  departurePlace: string
  departureAt: Date
}

export type TransportSummary = TransportInput & {
  id: string
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
  /** Participants of the term who chose to get there on their own. */
  ownCount: number
}

export type EventTransport = {
  eventName: string
  eventLocation: string | null
  terms: TermTransport[]
}

export type TransportParticipant = { applicationId: string; name: string; email: string }

export type TransportParticipants = TermInfo & {
  /** The transport's name; null for own transport (the frontend translates it). */
  name: string | null
  participants: TransportParticipant[]
}

export type ApplicationTransport = {
  participantName: string
  eventName: string
  terms: (TermInfo & {
    status: string
    selectedTransportId: string | null
    isOwn: boolean
    options: (TransportInput & { id: string })[]
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
