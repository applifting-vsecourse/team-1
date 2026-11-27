import { Locale } from "@/core/email/locale"
import { termLabel } from "@/modules/applications/domain/term-label"
import { PaymentReceivedMessage } from "@/modules/participants/domain/queued-email"

type TermBalance = { id: string; owedCzk: number }

/**
 * E-mail no. 8 (US-117): the confirmed terms whose debt a payment closed, i.e. owed more than
 * nothing before and nothing (or less, an overpayment) after. A payment that only reduces the
 * debt, or lands on a term that already is paid, closes nothing and sends nothing.
 */
export function planPaymentConfirmations<T extends TermBalance>(
  before: TermBalance[],
  after: T[],
): T[] {
  return after.filter(
    (term) =>
      term.owedCzk <= 0 &&
      before.some((candidate) => candidate.id === term.id && candidate.owedCzk > 0),
  )
}

/** One e-mail for the application, even when a summary payment closed several terms (EMAILY.md). */
export function paymentReceivedMessage(
  context: {
    email: string
    accessToken: string
    locale: Locale
    eventName: string
    organizationName: string
    firstName: string
    lastName: string
  },
  terms: { name: string | null; startsOn: Date; endsOn: Date }[],
): PaymentReceivedMessage {
  return {
    email: context.email,
    accessToken: context.accessToken,
    locale: context.locale,
    eventName: context.eventName,
    organizationName: context.organizationName,
    participant: `${context.firstName} ${context.lastName}`,
    termName: terms.map((term) => termLabel(term, context.locale)).join(", "),
  }
}
