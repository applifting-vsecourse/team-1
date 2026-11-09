import {
  EvaluationMode,
  isEvaluationModeLocked,
} from "@/modules/applications/domain/evaluation-mode"
import {
  isOpenForApplications,
  missingForApplications,
  MissingForApplications,
} from "@/modules/applications/domain/public-event"

/** A term in the event list: its dates, name and how full it is. */
export type EventTermSummary = {
  id: string
  name: string | null
  /** ISO dates, `2027-07-04`. */
  startsOn: string
  endsOn: string
  roomMode: "GENDERED" | "SHARED"
  roomCount: number
  /** All beds of the term's own rooms (US-99). */
  capacity: number
  confirmedCount: number
}

/** What the repository returns: the event plus the counts the readiness check needs. */
export type StoredEvent = {
  id: string
  organizationId: string
  organizationName: string
  /** Contact e-mail of the organization; the public page form offers it until the event has its own. */
  organizationContactEmail: string | null
  name: string
  description: string | null
  location: string | null
  contactEmail: string | null
  contactPhone: string | null
  /** Listed in the public catalog (US-122); off until the organizer turns it on. */
  publishedInCatalog: boolean
  /** File name of the page photo; `null` without one. */
  photoFileName: string | null
  publicToken: string
  createdAt: Date
  termCount: number
  /** Terms still offered that have no room; the application link stays closed while any does. */
  termsWithoutRooms: number
  applicationCount: number
  evaluationMode: EvaluationMode
  /** First day when cancellation rules apply; null means changes happen immediately. */
  cancellationStartsOn: string | null
  /** Free text shown to applicants (US-47); null until the organizer writes it. */
  cancellationTerms: string | null
  /** ISO dates, `2027-07-04`: first term start and last term end; null without terms. */
  startsOn: string | null
  endsOn: string | null
  /** Terms that are still offered, in chronological order. */
  terms: EventTermSummary[]
}

export type OrganizerEvent = StoredEvent & {
  /** The application link works (public page answers 200). */
  applicationsOpen: boolean
  /** What the organizer still has to add before it does. */
  missing: MissingForApplications[]
  /** The evaluation mode can no longer be changed (applications are open, US-101). */
  evaluationModeLocked: boolean
}

export type NewEvent = {
  organizationId: string
  name: string
  description: string | null
  location: string | null
  publicToken: string
}

/** Readiness comes only from `applications/domain/public-event` — never recomputed here. */
export function toOrganizerEvent(event: StoredEvent): OrganizerEvent {
  const setup = { termCount: event.termCount, termsWithoutRooms: event.termsWithoutRooms }
  return {
    ...event,
    applicationsOpen: isOpenForApplications(setup),
    missing: missingForApplications(setup),
    evaluationModeLocked: isEvaluationModeLocked({
      ...setup,
      applicationCount: event.applicationCount,
    }),
  }
}
