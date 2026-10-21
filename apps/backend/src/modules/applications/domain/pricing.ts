import { ApplicationTermStatus } from "./evaluation"

/** Live total of the terms ticked in the form, before evaluation (US-40). */
export function computeSelectionPrice(termPricesCzk: number[]): number {
  return termPricesCzk.reduce((sum, price) => sum + price, 0)
}

/** Amount due = sum of frozen prices of CONFIRMED terms only (US-40). */
export function computeAmountDue(
  terms: { status: ApplicationTermStatus; priceCzk: number }[],
): number {
  return terms
    .filter((term) => term.status === "CONFIRMED")
    .reduce((sum, term) => sum + term.priceCzk, 0)
}

export function computeAmountPaid(payments: { amountCzk: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCzk, 0)
}

/**
 * Owed = due − paid (US-44). Negative means an overpayment and is shown as
 * such rather than hidden.
 */
export function computeAmountOwed(amountDue: number, amountPaid: number): number {
  return amountDue - amountPaid
}

/** How the payment of an application stands, as the participant sees it (US-54). */
export type PaymentStatus = "NOTHING_DUE" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERPAID"

/** Nothing due (no confirmed term) wins over unpaid; any overpayment shows as one. */
export function computePaymentStatus(amountDue: number, amountPaid: number): PaymentStatus {
  const owed = computeAmountOwed(amountDue, amountPaid)
  if (owed < 0) return "OVERPAID"
  if (amountDue === 0) return "NOTHING_DUE"
  if (owed === 0) return "PAID"
  return amountPaid === 0 ? "UNPAID" : "PARTIALLY_PAID"
}

/** "Paid" without an amount means the whole amount due (US-44). */
export function resolvePaymentAmount(amountCzk: number | undefined, amountDue: number): number {
  return amountCzk ?? amountDue
}
