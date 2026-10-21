import {
  isOpenForApplications,
  missingForApplications,
  MissingForApplications,
} from "@/modules/applications/domain/public-event"

/** What the repository returns: the event plus the counts the readiness check needs. */
export type StoredEvent = {
  id: string
  organizationId: string
  organizationName: string
  name: string
  description: string | null
  location: string | null
  publicToken: string
  createdAt: Date
  termCount: number
  roomCount: number
  /** ISO dates, `2027-07-04`: first term start and last term end; null without terms. */
  startsOn: string | null
  endsOn: string | null
}

export type OrganizerEvent = StoredEvent & {
  /** The application link works (public page answers 200). */
  applicationsOpen: boolean
  /** What the organizer still has to add before it does. */
  missing: MissingForApplications[]
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
  const setup = { termCount: event.termCount, roomCount: event.roomCount }
  return {
    ...event,
    applicationsOpen: isOpenForApplications(setup),
    missing: missingForApplications(setup),
  }
}
