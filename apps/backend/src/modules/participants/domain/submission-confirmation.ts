import { Locale } from "@/core/email/locale"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { Gender } from "@/shared/domain/gender"

/** One application of a submission — one per participant (the person going to the event). */
export type SubmittedApplication = {
  /** Application.number — with the term number it makes the variable symbols (× 1000). */
  number: number
  firstName: string
  lastName: string
  /** Secret of this application's confirmation page `/apply/confirmation/<accessToken>`. */
  accessToken: string
  /** Terms as evaluated; the price is the one frozen at evaluation. */
  terms: {
    name: string
    /** `Term.number`, the last three digits of the term's variable symbol. */
    termNumber: number
    status: ApplicationTermStatus
    priceCzk: number
  }[]
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

/**
 * What changed in an application after it was submitted (docs/procesy/zpracovani-prihlasky/EMAILY.md,
 * the number is the row): the status of one term changed.
 */
export type ApplicationChangeKind =
  /** 2: K vyhodnocení → Potvrzená s dluhem. */
  | "CONFIRMED"
  /** 5: Náhradník → Potvrzená s dluhem. */
  | "CONFIRMED_FROM_WAITLIST"
  /** 3: K vyhodnocení → Náhradník. */
  | "WAITLISTED"
  /** 13: Potvrzená s dluhem → Náhradník, a template of its own (D-074). */
  | "WAITLISTED_AFTER_CONFIRMED"
  /** 4, 9, 10: zamítnuto. */
  | "REJECTED"
  /** 11: the applicant cancelled (US-84). */
  | "CANCELLED"
  /** 6: US-106, the waitlisted application was cancelled on the first day of the term. */
  | "NO_BED_FREED"
  /** 14: Náhradník → Zrušená by the organizer. */
  | "CANCELLED_BY_ORGANIZER"
  /** US-33 / US-84: the terms of the application changed; no trigger yet. */
  | "TERMS_CHANGED"

/** One changed application → one e-mail to the applicant. */
export type ApplicationChange = {
  email: string
  /** Language of the e-mail, decided by `resolveChangeEmailLocale` (D-078). */
  locale: Locale
  eventName: string
  /** The organization that runs the event; the footer of the e-mail. */
  organizationName: string
  bankAccount: string
  kind: ApplicationChangeKind
  /** The term that changed: its name, else its dates. */
  termName: string
  /** Of the participant: the Czech copy is gendered. */
  gender: Gender
  /** The application as it stands now. */
  application: SubmittedApplication
  /** The amount due changed: the e-mail repeats the payment details. */
  isAmountChanged: boolean
}
