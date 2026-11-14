import { ApplicationTermStatus } from "./evaluation"

/** Live total of the terms ticked in the form, before evaluation (US-40). */
export function computeSelectionPrice(termPricesCzk: number[]): number {
  return termPricesCzk.reduce((sum, price) => sum + price, 0)
}

/** Amount due = sum of frozen prices of confirmed and archived terms (US-40). */
export function computeAmountDue(
  terms: { status: ApplicationTermStatus; priceCzk: number }[],
): number {
  return terms
    .filter((term) => term.status === "CONFIRMED" || term.status === "ARCHIVED")
    .reduce((sum, term) => sum + term.priceCzk, 0)
}

export function computeAmountPaid(payments: { amountCzk: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCzk, 0)
}

/** Maximum money that can be returned without creating a new debt. */
export function computeRefundableAmount(amountDue: number, amountPaid: number): number {
  return Math.max(0, -computeAmountOwed(amountDue, amountPaid))
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

/** An omitted receipt amount settles the remaining debt, accounting for earlier receipts. */
export function resolvePaymentAmount(
  amountCzk: number | undefined,
  amountDue: number,
  amountPaid = 0,
): number {
  return amountCzk ?? Math.max(0, computeAmountOwed(amountDue, amountPaid))
}

// ---------------------------------------------------------------------------
// Per application in a term (PVT, `ApplicationTerm`) — US-137, D-051.
// The summary of an application is the sum over its terms; the functions above
// stay as thin wrappers with unchanged values.
// ---------------------------------------------------------------------------

/** Due of one term: confirmed and archived terms retain their frozen price. */
export function computeTermDue(term: { status: ApplicationTermStatus; priceCzk: number }): number {
  return term.status === "CONFIRMED" || term.status === "ARCHIVED" ? term.priceCzk : 0
}

/** Paid of one term = sum of its non-cancelled rows (refunds are negative rows). */
export function computeTermPaid(payments: { amountCzk: number }[]): number {
  return computeAmountPaid(payments)
}

export function computeTermOwed(
  term: { status: ApplicationTermStatus; priceCzk: number },
  payments: { amountCzk: number }[],
): number {
  return computeAmountOwed(computeTermDue(term), computeTermPaid(payments))
}

export function computeTermPaymentStatus(
  term: { status: ApplicationTermStatus; priceCzk: number },
  payments: { amountCzk: number }[],
): PaymentStatus {
  return computePaymentStatus(computeTermDue(term), computeTermPaid(payments))
}

/** A term is in debt when it is confirmed and its payments do not cover its price (US-51, US-45). */
export function termHasDebt(
  term: { status: ApplicationTermStatus; priceCzk: number },
  payments: { amountCzk: number }[],
): boolean {
  return computeTermOwed(term, payments) > 0
}

/**
 * What a summary payment (`…000`) settles right now: the debt of terms that have
 * one. An overpayment of one term is not set off against another term's debt
 * (D-088), so this differs from `due − paid` of the whole application.
 */
export function computePayableAmount(termsOwedCzk: number[]): number {
  return termsOwedCzk.reduce((sum, owed) => sum + Math.max(0, owed), 0)
}

export type AllocationTerm = {
  applicationTermId: string
  status: ApplicationTermStatus
  startsOn: Date
  termNumber: number
  /** Current debt of the term (negative = overpaid). */
  owedCzk: number
}

export type AllocatedPayment = { applicationTermId: string; amountCzk: number }

/**
 * Splits a summary payment into rows per term. Order: earliest term first (by
 * start date, tie → term number), only CONFIRMED terms with a debt, each up to
 * its debt. What is left is an overpayment on the last CONFIRMED term in that
 * order — or, with no confirmed term, on the last term of the list. Shortfall
 * therefore stays on the latest terms. Knows nothing about application borders,
 * so it can later run over the terms of a whole submission.
 */
export function allocatePayment(amountCzk: number, terms: AllocationTerm[]): AllocatedPayment[] {
  if (terms.length === 0 || amountCzk <= 0) return []
  const ordered = [...terms].sort(
    (a, b) => a.startsOn.getTime() - b.startsOn.getTime() || a.termNumber - b.termNumber,
  )
  const confirmed = ordered.filter((term) => term.status === "CONFIRMED")
  const rows: AllocatedPayment[] = []
  let left = amountCzk
  for (const term of confirmed) {
    if (left === 0) break
    if (term.owedCzk <= 0) continue
    const part = Math.min(left, term.owedCzk)
    rows.push({ applicationTermId: term.applicationTermId, amountCzk: part })
    left -= part
  }
  if (left > 0) {
    const pool = confirmed.length > 0 ? confirmed : ordered
    const target = pool[pool.length - 1]
    const existing = rows.find((row) => row.applicationTermId === target.applicationTermId)
    if (existing) existing.amountCzk += left
    else rows.push({ applicationTermId: target.applicationTermId, amountCzk: left })
  }
  return rows
}
