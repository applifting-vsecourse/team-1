import { ApplicationTermStatus } from "./evaluation"
import { computeOverviewPaymentDeadline } from "./payment-deadline"
import {
  computeAmountDue,
  computeAmountPaid,
  computePayableAmount,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
  computeTermPaymentStatus,
  PaymentStatus,
} from "./pricing"
import { variableSymbol } from "./variable-symbol"

/** One application in a term (PVT) with its non-cancelled payment rows — what payments are computed from. */
export type PaymentTermRecord = {
  termId: string
  /** `Term.number` — the last three digits of the term's variable symbol. */
  termNumber: number
  startsOn: Date
  status: ApplicationTermStatus
  /** Price frozen at evaluation. */
  priceCzk: number
  payments: { amountCzk: number }[]
  /** Latest confirmation of the term; with `paymentPeriodDays` it gives the due date (US-41). */
  confirmedAt?: Date | null
  /** Restart of the payment period after a correction (US-112). */
  paymentPeriodStartedAt?: Date | null
}

/** Summary over the terms of one application: Σ due and Σ paid, as before US-137. */
export function computeApplicationDue(
  terms: Pick<PaymentTermRecord, "status" | "priceCzk">[],
): number {
  return computeAmountDue(terms)
}

export function computeApplicationPaid(terms: Pick<PaymentTermRecord, "payments">[]): number {
  return computeAmountPaid(terms.flatMap((term) => term.payments))
}

export type TermPaymentDetail = {
  termId: string
  termNumber: number
  variableSymbol: string
  dueCzk: number
  paidCzk: number
  /** Negative is an overpayment of this term. */
  owedCzk: number
  paymentStatus: PaymentStatus
  /** When the debt of this term falls due (D-099); `null` when nothing is owed or it is not known. */
  paymentDeadline: Date | null
}

export type PaymentDetails = {
  bankAccount: string
  summary: {
    /** `…000`: pays the whole current debt of the application. */
    variableSymbol: string
    /** Σ max(0, owed) of the terms — an overpaid term is not set off against another one (D-088). */
    payableCzk: number
  }
  /** Confirmed terms only, earliest first. */
  terms: TermPaymentDetail[]
}

/**
 * Where and how much to pay. `null` while no term is confirmed: a waitlisted
 * term has no variable symbol to pay (US-25). This is the contract the QR
 * generator (US-127) builds on.
 */
export function buildPaymentDetails(
  applicationNumber: number,
  bankAccount: string,
  terms: PaymentTermRecord[],
  /** Event's payment period; without it no deadline is computed. */
  paymentPeriodDays?: number,
): PaymentDetails | null {
  const confirmed = terms
    .filter((term) => term.status === "CONFIRMED")
    .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime() || a.termNumber - b.termNumber)
  if (confirmed.length === 0) return null

  const details = confirmed.map((term) => {
    const owedCzk = computeTermOwed(term, term.payments)
    return {
      termId: term.termId,
      termNumber: term.termNumber,
      variableSymbol: variableSymbol(applicationNumber, term.termNumber),
      dueCzk: computeTermDue(term),
      paidCzk: computeTermPaid(term.payments),
      owedCzk,
      paymentStatus: computeTermPaymentStatus(term, term.payments),
      paymentDeadline:
        owedCzk > 0 && term.confirmedAt && paymentPeriodDays !== undefined
          ? computeOverviewPaymentDeadline({
              confirmedAt: term.confirmedAt,
              paymentPeriodStartedAt: term.paymentPeriodStartedAt ?? null,
              startsOn: term.startsOn,
              paymentPeriodDays,
            })
          : null,
    }
  })
  return {
    bankAccount,
    summary: {
      variableSymbol: variableSymbol(applicationNumber),
      payableCzk: computePayableAmount(details.map((term) => term.owedCzk)),
    },
    terms: details,
  }
}
