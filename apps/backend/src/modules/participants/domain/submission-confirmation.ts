import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** One application of a submission — one per participant (the person going to the event). */
export type SubmittedApplication = {
  /** Application.number — the variable symbol of this application's payment. */
  number: number
  firstName: string
  lastName: string
  /** Secret of this application's confirmation page `/apply/confirmation/<accessToken>`. */
  accessToken: string
  /** Terms as evaluated; the price is the one frozen at evaluation. */
  terms: { name: string; status: ApplicationTermStatus; priceCzk: number }[]
}

/**
 * One submission of the application form = one summary e-mail to the
 * applicant, however many participants they signed up (decided by the PO,
 * 2026-10-21, docs/PROJEKT.md §10). Stream B hands it over once, after every
 * application of the submission is stored.
 */
export type SubmissionConfirmation = {
  /** The applicant's e-mail — where the summary goes. */
  email: string
  /** Application.locale — language of the e-mail. */
  locale: Locale
  eventName: string
  /** Account number of the organization that runs the event. */
  bankAccount: string
  /**
   * `ensureAccount().mustSetPassword`: the account has no password yet, so the
   * e-mail carries a magic link; otherwise a link to the sign-in page.
   */
  mustSetPassword: boolean
  /** One per participant, each with its own variable symbol and amount due. */
  applications: SubmittedApplication[]
}

/** What changed in an application after it was submitted (US-28, 32, 33, 34, 84). */
export type ApplicationChangeKind =
  "STATUS_CHANGED" | "WAITLISTED" | "REJECTED" | "CANCELLED" | "TERMS_CHANGED"

/** One changed application → one e-mail to the applicant. */
export type ApplicationChange = {
  email: string
  locale: Locale
  eventName: string
  bankAccount: string
  kind: ApplicationChangeKind
  /** The application as it stands now. */
  application: SubmittedApplication
  /** The amount due changed: the e-mail repeats the payment details. */
  isAmountChanged: boolean
}
