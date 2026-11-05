import { ApplicationTermStatus } from "./evaluation"
import {
  allocatePayment,
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computeRefundableAmount,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
} from "./pricing"

type PreviewTerm = {
  applicationTermId: string
  termId: string
  termNumber: number
  startsOn: Date
  status: ApplicationTermStatus
  priceCzk: number
  payments: { receiptId: string; amountCzk: number }[]
}

export type PaymentCorrectionPreview = {
  amountOwedCzk: number
  terms: { termId: string; owedCzk: number; changeCzk: number }[]
}

type PreviewResult =
  | { ok: true; preview: PaymentCorrectionPreview }
  | {
      ok: false
      errorCode:
        "REFUND_TERM_REQUIRED" | "PAYMENT_TERM_NOT_IN_APPLICATION" | "REFUND_EXCEEDS_OVERPAYMENT"
    }

/** Simulates the same whole-receipt cancellation and allocation as a saved correction. */
export function computePaymentCorrectionPreview(input: {
  terms: PreviewTerm[]
  receiptId: string
  termId?: string
  amountCzk: number
  isRefund: boolean
}): PreviewResult {
  const remaining = input.terms.map((term) => ({
    ...term,
    payments: term.payments.filter((row) => row.receiptId !== input.receiptId),
  }))
  const target = remaining.find((term) => term.termId === input.termId)
  if (input.isRefund && input.termId === undefined)
    return { ok: false, errorCode: "REFUND_TERM_REQUIRED" }
  if (input.termId !== undefined && !target)
    return { ok: false, errorCode: "PAYMENT_TERM_NOT_IN_APPLICATION" }
  if (
    input.isRefund &&
    target &&
    input.amountCzk >
      computeRefundableAmount(computeTermDue(target), computeTermPaid(target.payments))
  )
    return { ok: false, errorCode: "REFUND_EXCEEDS_OVERPAYMENT" }

  const rows = target
    ? [
        {
          applicationTermId: target.applicationTermId,
          amountCzk: input.isRefund ? -input.amountCzk : input.amountCzk,
        },
      ]
    : allocatePayment(
        input.amountCzk,
        remaining.map((term) => ({ ...term, owedCzk: computeTermOwed(term, term.payments) })),
      )
  const terms = remaining.map((term, index) => {
    const payments = [
      ...term.payments,
      ...rows.filter((row) => row.applicationTermId === term.applicationTermId),
    ]
    const owedCzk = computeTermOwed(term, payments)
    return {
      termId: term.termId,
      owedCzk,
      changeCzk: owedCzk - computeTermOwed(input.terms[index], input.terms[index].payments),
    }
  })
  return {
    ok: true,
    preview: {
      amountOwedCzk: computeAmountOwed(
        computeAmountDue(remaining),
        computeAmountPaid([...remaining.flatMap((term) => term.payments), ...rows]),
      ),
      terms,
    },
  }
}
