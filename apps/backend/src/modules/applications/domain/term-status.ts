import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** One entry of the system log of status changes (US-28): who, when, from which status to which. */
export type StatusChangeEntry = {
  fromStatus: ApplicationTermStatus
  toStatus: ApplicationTermStatus
  /** Name of the organizer; null when the system changed the status. */
  changedByName: string | null
  changedAt: Date
}

/** An application in a term as the organizer sees it in the detail. */
export type TermStatusDetail = {
  termId: string
  name: string
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
  locale: Locale
  eventName: string
  bankAccount: string
  application: {
    number: number
    firstName: string
    lastName: string
    accessToken: string
    terms: { name: string; status: ApplicationTermStatus; priceCzk: number }[]
  }
}
