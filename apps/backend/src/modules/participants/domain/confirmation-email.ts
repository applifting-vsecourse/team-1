import { formatCzk } from "@/core/email/format-czk"
import type { ApplicationChangeProps } from "@/core/email/templates/application-change"
import type { ConfirmationWithdrawnProps } from "@/core/email/templates/application-change-confirmation-withdrawn"
import type { ConfirmationApplicationProps } from "@/core/email/templates/application-confirmation"
import { computeAmountDue, computeTermDue } from "@/modules/applications/domain/pricing"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"
import {
  ApplicationChange,
  SubmissionConfirmation,
  SubmittedApplication,
} from "@/modules/participants/domain/submission-confirmation"

/** The applicant's confirmation page of one application (US-25). */
export const confirmationUrl = (frontendUrl: string, accessToken: string): string =>
  `${frontendUrl}/apply/confirmation/${encodeURIComponent(accessToken)}`

export const loginUrl = (frontendUrl: string): string => `${frontendUrl}/participant/login`

type Payment = NonNullable<ConfirmationApplicationProps["payment"]>

/**
 * Payment details of one application: only when a term is confirmed. The amount is the
 * pricing domain's amount due under the summary symbol `…000`; with several confirmed
 * terms each one is listed with its own symbol too (US-137). Payments of several
 * applications never add up.
 */
function paymentOf(
  application: SubmittedApplication,
  bankAccount: string,
  locale: SubmissionConfirmation["locale"],
): Payment | null {
  if (!application.terms.some((term) => term.status === "CONFIRMED")) return null
  const confirmed = application.terms.filter((term) => term.status === "CONFIRMED")
  return {
    amount: formatCzk(computeAmountDue(application.terms), locale),
    bankAccount,
    variableSymbol: variableSymbol(application.number),
    terms:
      confirmed.length > 1
        ? confirmed.map((term) => ({
            name: term.name,
            amount: formatCzk(computeTermDue(term), locale),
            variableSymbol: variableSymbol(application.number, term.termNumber),
          }))
        : [],
  }
}

/** A submission only knows evaluated terms; a cancelled one never appears in the summary. */
const termsOf = (application: SubmittedApplication): ConfirmationApplicationProps["terms"] =>
  application.terms.flatMap(({ name, status }) =>
    status === "CANCELLED" ? [] : [{ name, status }],
  )

export function buildConfirmationApplications(
  confirmation: SubmissionConfirmation,
  frontendUrl: string,
): ConfirmationApplicationProps[] {
  return confirmation.applications.map((application) => ({
    name: `${application.firstName} ${application.lastName}`,
    terms: termsOf(application),
    payment: paymentOf(application, confirmation.bankAccount, confirmation.locale),
    confirmationUrl: confirmationUrl(frontendUrl, application.accessToken),
  }))
}

/** The kinds that payment details can belong to: where the application became confirmed. */
const PAYING_KINDS: ApplicationChange["kind"][] = [
  "CONFIRMED",
  "CONFIRMED_FROM_WAITLIST",
  "TERMS_CHANGED",
]

/**
 * Props of the change e-mail; the payment details only when the amount due changed because
 * the application became confirmed (EMAILY.md, rows 2 and 5) — never in a cancelled or
 * waitlisted one, which owes nothing.
 */
export function buildChangeProps(
  change: ApplicationChange & { kind: ApplicationChangeProps["kind"] },
  frontendUrl: string,
): ApplicationChangeProps {
  const { application } = change
  return {
    locale: change.locale,
    eventName: change.eventName,
    organizationName: change.organizationName,
    name: `${application.firstName} ${application.lastName}`,
    gender: change.gender,
    term: change.termName,
    kind: change.kind,
    terms:
      change.kind === "TERMS_CHANGED"
        ? application.terms.map(({ name, status }) => ({ name, status }))
        : [],
    payment:
      change.isAmountChanged && PAYING_KINDS.includes(change.kind)
        ? paymentOf(application, change.bankAccount, change.locale)
        : null,
    confirmationUrl: confirmationUrl(frontendUrl, application.accessToken),
  }
}

/** Props of the e-mails without payment details: no. 13 (and no. 15 once a term can be cancelled). */
export function buildTermNoticeProps(
  change: ApplicationChange,
  frontendUrl: string,
): ConfirmationWithdrawnProps {
  const { application } = change
  return {
    locale: change.locale,
    eventName: change.eventName,
    organizationName: change.organizationName,
    name: `${application.firstName} ${application.lastName}`,
    gender: change.gender,
    term: change.termName,
    confirmationUrl: confirmationUrl(frontendUrl, application.accessToken),
  }
}
