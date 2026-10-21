import { formatCzk } from "@/core/email/format-czk"
import type { ConfirmationApplicationProps } from "@/core/email/templates/application-confirmation"
import { computeAmountDue } from "@/modules/applications/domain/pricing"
import { toVariableSymbol } from "@/modules/participants/domain/my-application"
import {
  SubmissionConfirmation,
  SubmittedApplication,
} from "@/modules/participants/domain/submission-confirmation"

/** The applicant's confirmation page of one application (US-25). */
export const confirmationUrl = (frontendUrl: string, accessToken: string): string =>
  `${frontendUrl}/apply/confirmation/${encodeURIComponent(accessToken)}`

export const loginUrl = (frontendUrl: string): string => `${frontendUrl}/participant/login`

type Payment = NonNullable<ConfirmationApplicationProps["payment"]>

/**
 * Payment details of one application: only when a term is confirmed. The
 * amount is the pricing domain's amount due, the variable symbol the
 * application's own number — payments of several applications never add up.
 */
function paymentOf(
  application: SubmittedApplication,
  bankAccount: string,
  locale: SubmissionConfirmation["locale"],
): Payment | null {
  if (!application.terms.some((term) => term.status === "CONFIRMED")) return null
  return {
    amount: formatCzk(computeAmountDue(application.terms), locale),
    bankAccount,
    variableSymbol: toVariableSymbol(application.number),
  }
}

const termsOf = (application: SubmittedApplication): ConfirmationApplicationProps["terms"] =>
  application.terms.map(({ name, status }) => ({ name, status }))

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
