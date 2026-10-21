import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
} from "@/modules/applications/domain/pricing"

/** One application of the signed-in participant as stored — what the overview is built from (US-54). */
export type MyApplicationRecord = {
  id: string
  /** Global sequence, the variable symbol. */
  number: number
  submittedAt: Date
  firstName: string
  lastName: string
  eventName: string
  /** Account number of the organization that runs the event. */
  bankAccount: string
  terms: {
    termId: string
    name: string
    startsOn: Date
    endsOn: Date
    status: ApplicationTermStatus
    /** Price frozen at evaluation. */
    priceCzk: number
  }[]
  payments: { amountCzk: number }[]
}

/** Who stands in a term's waiting list: the application's arrival decides the order. */
export type WaitlistedArrival = { submittedAt: Date; number: number }

export type MyApplicationTerm = {
  termId: string
  name: string
  /** ISO dates, e.g. "2027-07-04". */
  startsOn: string
  endsOn: string
  status: ApplicationTermStatus
  priceCzk: number
  /** 1-based place in the term's waiting list; `null` when confirmed. */
  waitlistPosition: number | null
}

/** Where and how much to pay — only when at least one term is confirmed (US-25). */
export type PaymentDetails = {
  bankAccount: string
  variableSymbol: string
}

export type MyApplication = {
  id: string
  eventName: string
  firstName: string
  lastName: string
  /** The number as the variable symbol, four digits: 48 → "0048". */
  variableSymbol: string
  terms: MyApplicationTerm[]
  amountDueCzk: number
  amountPaidCzk: number
  /** Due − paid; negative is an overpayment and is shown as such. */
  amountOwedCzk: number
  paymentDetails: PaymentDetails | null
}

export const toVariableSymbol = (number: number): string => String(number).padStart(4, "0")

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

/** Place in the waiting list: one more than the number of applications that arrived earlier. */
export function waitlistPosition(
  self: WaitlistedArrival,
  waitlisted: readonly WaitlistedArrival[],
): number {
  const earlier = waitlisted.filter(
    (other) =>
      other.submittedAt < self.submittedAt ||
      (other.submittedAt.getTime() === self.submittedAt.getTime() && other.number < self.number),
  )
  return earlier.length + 1
}

/**
 * Builds the overview of one application. Amounts come from the pricing
 * functions of the applications domain — nothing is recomputed here.
 * `queues` maps a term id to everyone waitlisted in it.
 */
export function buildMyApplication(
  record: MyApplicationRecord,
  queues: ReadonlyMap<string, readonly WaitlistedArrival[]>,
): MyApplication {
  const amountDueCzk = computeAmountDue(record.terms)
  const amountPaidCzk = computeAmountPaid(record.payments)
  const variableSymbol = toVariableSymbol(record.number)
  const self = { submittedAt: record.submittedAt, number: record.number }

  return {
    id: record.id,
    eventName: record.eventName,
    firstName: record.firstName,
    lastName: record.lastName,
    variableSymbol,
    terms: [...record.terms]
      .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime())
      .map((term) => ({
        termId: term.termId,
        name: term.name,
        startsOn: toIsoDate(term.startsOn),
        endsOn: toIsoDate(term.endsOn),
        status: term.status,
        priceCzk: term.priceCzk,
        waitlistPosition:
          term.status === "WAITLISTED"
            ? waitlistPosition(self, queues.get(term.termId) ?? [])
            : null,
      })),
    amountDueCzk,
    amountPaidCzk,
    amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
    // All terms waitlisted: nothing to pay yet, so no payment details (US-25).
    paymentDetails: record.terms.some((term) => term.status === "CONFIRMED")
      ? { bankAccount: record.bankAccount, variableSymbol }
      : null,
  }
}
