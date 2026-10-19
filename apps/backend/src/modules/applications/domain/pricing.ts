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

/** "Paid" without an amount means the whole amount due (US-44). */
export function resolvePaymentAmount(amountCzk: number | undefined, amountDue: number): number {
  return amountCzk ?? amountDue
}
