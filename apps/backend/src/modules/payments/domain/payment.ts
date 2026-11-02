import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeApplicationDue,
  computeApplicationPaid,
} from "@/modules/applications/domain/payment-details"
import {
  computeAmountOwed,
  computePayableAmount,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
  computeTermPaymentStatus,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"

/** One stored row: money of one receipt on one application in a term. */
export type PaymentRow = {
  id: string
  receiptId: string
  amountCzk: number
  recordedByName: string
  createdAt: Date
}

export type PaymentTerm = {
  applicationTermId: string
  termId: string
  termNumber: number
  status: ApplicationTermStatus
  priceCzk: number
  startsOn: Date
  endsOn: Date
  /** Non-cancelled rows only. */
  payments: PaymentRow[]
}

export type PaymentApplication = {
  id: string
  eventId: string
  eventName: string
  number: number
  firstName: string
  lastName: string
  terms: PaymentTerm[]
}

export type PaymentTermSummary = PaymentTerm & {
  variableSymbol: string
  dueCzk: number
  paidCzk: number
  /** Negative is an overpayment of this term. */
  owedCzk: number
  paymentStatus: PaymentStatus
}

/** One receipt: money that arrived at once, split into rows per term. */
export type Receipt = {
  id: string
  amountCzk: number
  recordedByName: string
  createdAt: Date
  rows: { applicationTermId: string; termId: string; termNumber: number; amountCzk: number }[]
}

export type PaymentSummary = Omit<PaymentApplication, "terms"> & {
  terms: PaymentTermSummary[]
  receipts: Receipt[]
  /** Summary symbol `…000`. */
  variableSymbol: string
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  /** What a summary payment settles right now (overpaid terms not set off). */
  payableCzk: number
}

/** Groups the rows of an application by receipt, in the order the receipts arrived. */
export function groupReceipts(terms: PaymentTerm[]): Receipt[] {
  const receipts = new Map<string, Receipt>()
  const rows = terms
    .flatMap((term) => term.payments.map((payment) => ({ term, payment })))
    .sort(
      (a, b) =>
        a.payment.createdAt.getTime() - b.payment.createdAt.getTime() ||
        a.payment.id.localeCompare(b.payment.id),
    )
  for (const { term, payment } of rows) {
    const receipt = receipts.get(payment.receiptId) ?? {
      id: payment.receiptId,
      amountCzk: 0,
      recordedByName: payment.recordedByName,
      createdAt: payment.createdAt,
      rows: [],
    }
    receipt.amountCzk += payment.amountCzk
    receipt.rows.push({
      applicationTermId: term.applicationTermId,
      termId: term.termId,
      termNumber: term.termNumber,
      amountCzk: payment.amountCzk,
    })
    receipts.set(payment.receiptId, receipt)
  }
  return [...receipts.values()]
}

export function paymentSummary(application: PaymentApplication): PaymentSummary {
  const terms = [...application.terms]
    .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime() || a.termNumber - b.termNumber)
    .map((term) => ({
      ...term,
      variableSymbol: variableSymbol(application.number, term.termNumber),
      dueCzk: computeTermDue(term),
      paidCzk: computeTermPaid(term.payments),
      owedCzk: computeTermOwed(term, term.payments),
      paymentStatus: computeTermPaymentStatus(term, term.payments),
    }))
  const amountDueCzk = computeApplicationDue(terms)
  const amountPaidCzk = computeApplicationPaid(terms)
  return {
    ...application,
    terms,
    receipts: groupReceipts(terms),
    variableSymbol: variableSymbol(application.number),
    amountDueCzk,
    amountPaidCzk,
    amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
    payableCzk: computePayableAmount(terms.map((term) => term.owedCzk)),
  }
}
