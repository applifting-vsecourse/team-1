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

/** Due of one term: its frozen price when CONFIRMED, otherwise nothing (waitlist, cancelled). */
export function computeTermDue(term: { status: ApplicationTermStatus; priceCzk: number }): number {
  return term.status === "CONFIRMED" ? term.priceCzk : 0
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

/**
 * What the organizer's summary payment settles (US-111): the debts of the CONFIRMED terms less
 * their overpayments, never below 0. Unlike `computePayableAmount` (what the participant pays,
 * term by term) it sets an overpaid term off against the debt of another one.
 */
export function computeSummaryPayable(terms: AllocationTerm[]): number {
  const confirmed = terms.filter((term) => term.status === "CONFIRMED")
  const debt = confirmed.reduce((sum, term) => sum + Math.max(0, term.owedCzk), 0)
  const overpaid = confirmed.reduce((sum, term) => sum + Math.max(0, -term.owedCzk), 0)
  return Math.max(0, debt - overpaid)
}

/**
 * Splits one summary payment (US-111) into the rows of a single receipt. An overpayment of a
 * confirmed term is set off against the debt of another one: it shows as a negative row on the
 * overpaid term (most overpaid first), so paying `computeSummaryPayable` leaves every term at 0.
 * The rows add up to `amountCzk`. Without a debt, or with the money covering all of it, nothing
 * is set off and the result is `allocatePayment`.
 */
export function allocateSummaryPayment(
  amountCzk: number,
  terms: AllocationTerm[],
): AllocatedPayment[] {
  const confirmed = terms.filter((term) => term.status === "CONFIRMED")
  const debt = confirmed.reduce((sum, term) => sum + Math.max(0, term.owedCzk), 0)
  const overpaid = confirmed
    .filter((term) => term.owedCzk < 0)
    .sort(
      (a, b) =>
        a.owedCzk - b.owedCzk ||
        a.startsOn.getTime() - b.startsOn.getTime() ||
        a.termNumber - b.termNumber,
    )
  const available = overpaid.reduce((sum, term) => sum - term.owedCzk, 0)
  const offset = Math.min(available, Math.max(0, debt - amountCzk))
  const rows = allocatePayment(amountCzk + offset, terms)
  let left = offset
  for (const term of overpaid) {
    if (left === 0) break
    const part = Math.min(left, -term.owedCzk)
    rows.push({ applicationTermId: term.applicationTermId, amountCzk: -part })
    left -= part
  }
  return rows
}
