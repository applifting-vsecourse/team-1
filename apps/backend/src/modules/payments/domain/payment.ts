import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
} from "@/modules/applications/domain/pricing"

export type Payment = {
  id: string
  amountCzk: number
  recordedByName: string
  createdAt: Date
}

export type PaymentApplication = {
  id: string
  eventId: string
  eventName: string
  number: number
  firstName: string
  lastName: string
  terms: { status: ApplicationTermStatus; priceCzk: number; startsOn: Date; endsOn: Date }[]
  payments: Payment[]
}

export type PaymentSummary = PaymentApplication & {
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
}

export function paymentSummary(application: PaymentApplication): PaymentSummary {
  const amountDueCzk = computeAmountDue(application.terms)
  const amountPaidCzk = computeAmountPaid(application.payments)
  return {
    ...application,
    amountDueCzk,
    amountPaidCzk,
    amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
  }
}
