import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePaymentStatus,
  PaymentStatus,
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

export type MyApplicationTerm = {
  termId: string
  name: string
  /** ISO dates, e.g. "2027-07-04". */
  startsOn: string
  endsOn: string
  status: ApplicationTermStatus
  priceCzk: number
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
  /** Reference for people: initials of the event and the number, "LKL-0048". */
  code: string
  /** The number as the variable symbol, four digits: 48 → "0048". */
  variableSymbol: string
  terms: MyApplicationTerm[]
  amountDueCzk: number
  amountPaidCzk: number
  /** Due − paid; negative is an overpayment and is shown as such. */
  amountOwedCzk: number
  paymentStatus: PaymentStatus
  paymentDetails: PaymentDetails | null
}

/**
 * The application's reference for people — initials of the event and the
 * number, `LKL-0048`. Display only: a bank accepts digits alone as a variable
 * symbol, so the payment uses `toVariableSymbol`.
 */
export function toApplicationCode(eventName: string, number: number): string {
  const initials = eventName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase())
    .join("")
  return `${initials || "P"}-${toVariableSymbol(number)}`
}

export const toVariableSymbol = (number: number): string => String(number).padStart(4, "0")

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

/**
 * Builds the overview of one application. Amounts come from the pricing
 * functions of the applications domain — nothing is recomputed here. The
 * participant sees a waitlisted term only as waitlisted, never
 * their place in line.
 */
export function buildMyApplication(record: MyApplicationRecord): MyApplication {
  const amountDueCzk = computeAmountDue(record.terms)
  const amountPaidCzk = computeAmountPaid(record.payments)
  const variableSymbol = toVariableSymbol(record.number)

  return {
    id: record.id,
    eventName: record.eventName,
    firstName: record.firstName,
    lastName: record.lastName,
    code: toApplicationCode(record.eventName, record.number),
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
      })),
    amountDueCzk,
    amountPaidCzk,
    amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
    paymentStatus: computePaymentStatus(amountDueCzk, amountPaidCzk),
    // All terms waitlisted: nothing to pay yet, so no payment details (US-25).
    paymentDetails: record.terms.some((term) => term.status === "CONFIRMED")
      ? { bankAccount: record.bankAccount, variableSymbol }
      : null,
  }
}
