/** Pseudo id of "own transport" (US-65): no transport chosen, so the participant gets there alone. */
export const OWN_TRANSPORT_ID = "own"

export type TransportInput = {
  name: string
  departurePlace: string
  departureAt: Date
}

export type TransportSummary = TransportInput & {
  id: string
  /** Applications of the event with an active term that chose this transport. */
  participantsCount: number
}

export type EventTransport = {
  eventName: string
  eventLocation: string | null
  transports: TransportSummary[]
  /** Applications with an active term that chose no transport. */
  ownCount: number
}

export type TransportParticipant = { applicationId: string; name: string; email: string }

export type TransportTermGroup = {
  termId: string
  termName: string | null
  startsOn: string
  endsOn: string
  participants: TransportParticipant[]
}

export type TransportParticipants = {
  /** The transport's name; null for own transport (the frontend translates it). */
  name: string | null
  groups: TransportTermGroup[]
}

export type ApplicationTransport = {
  participantName: string
  eventName: string
  selectedTransportId: string | null
  options: Omit<TransportSummary, "participantsCount">[]
}

/** The name `Adam Dvořák` of a participant, as in the lists. */
export const fullName = (firstName: string, lastName: string): string => `${firstName} ${lastName}`
