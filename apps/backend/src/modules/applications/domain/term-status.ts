import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { BedGroup } from "@/modules/applications/domain/waitlist"
import { Gender } from "@/shared/domain/gender"

/** One entry of the system log of status changes (US-28): who, when, from which status to which. */
export type StatusChangeEntry = {
  id: string
  kind: "STATUS_CHANGED" | "CREATED_BY_ORGANIZER"
  fromStatus: ApplicationTermStatus
  toStatus: ApplicationTermStatus
  /** Name of the organizer; null when the system changed the status. */
  changedByName: string | null
  changedAt: Date
}

/** Someone named in a record of a filled bed. */
export type SubstitutePerson = {
  applicationId: string
  name: string
  /** Status of the application in the term now, not when the record was written. */
  status: ApplicationTermStatus
}

/**
 * System record of one confirmation from the waitlist (US-105): who was confirmed, who was
 * skipped (waiting ahead of them in the same queue), who did it and when. Read-only.
 */
export type SubstituteRecord = {
  /** Id of the status change the record belongs to. */
  id: string
  termId: string
  /** Queue the confirmed one waited in: their gender, or the one common queue. */
  group: BedGroup
  confirmed: SubstitutePerson
  skipped: SubstitutePerson[]
  /** Name of the organizer; null when the system acted. */
  changedByName: string | null
  changedAt: Date
}

/** An application in a term as the organizer sees it in the detail. */
export type TermStatusDetail = {
  termId: string
  name: string | null
  startsOn: Date
  endsOn: Date
  status: ApplicationTermStatus
  priceCzk: number
  history: StatusChangeEntry[]
  /** Records of confirmations from the waitlist in which the application was confirmed or skipped. */
  substituteRecords: SubstituteRecord[]
}

/** Asked for a change of one application in a term. `actorId` is null for the system. */
export type StatusChangeCommand = {
  organizationId: string
  applicationId: string
  termId: string
  to: ApplicationTermStatus
  actorId: string | null
  /** The organizer knowingly confirms beyond the free beds. */
  isOverCapacityConfirmed: boolean
}

/** What a stored change leaves behind: enough to e-mail the applicant. */
export type StatusChangeResult = {
  from: ApplicationTermStatus
  to: ApplicationTermStatus
  email: string
  /** Language of the e-mail about the change, not necessarily of the application (D-078). */
  locale: Locale
  eventName: string
  organizationName: string
  bankAccount: string
  /** The changed term: its name, else its dates. */
  termName: string
  /** Of the participant: the Czech copy of the e-mail is gendered. */
  gender: Gender
  application: {
    number: number
    firstName: string
    lastName: string
    accessToken: string
    /** `name` is the term's label for the e-mail: its name, else its dates. */
    terms: { name: string; termNumber: number; status: ApplicationTermStatus; priceCzk: number }[]
  }
}

/** An application on the waitlist whose term has started (US-106). */
export type ExpiredWaitlistEntry = {
  organizationId: string
  applicationId: string
  termId: string
}
