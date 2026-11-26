import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** Who asked to settle the accommodation individually in one term, and what they wrote (#514, US-38). */
export type IndividualRequest = {
  applicationTermId: string
  applicationId: string
  firstName: string
  lastName: string
  status: ApplicationTermStatus
  /** The optional note of the applicant; null when they only ticked the box. */
  request: string | null
}

/** A cancelled or archived application in the term no longer takes part, so its request is not listed. */
export const INDIVIDUAL_REQUEST_EXCLUDED_STATUSES: readonly ApplicationTermStatus[] = [
  "CANCELLED",
  "ARCHIVED",
]
