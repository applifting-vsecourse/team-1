import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { Gender } from "@/shared/domain/gender"

/** One entry of the system log of status changes (US-28): who, when, from which status to which. */
export type StatusChangeEntry = {
  id: string
  fromStatus: ApplicationTermStatus
  toStatus: ApplicationTermStatus
  /** Name of the organizer; null when the system changed the status. */
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
