import { ApplicationTermStatus } from "./evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePaymentStatus,
  PaymentStatus,
} from "./pricing"

/** One application of a submission as stored — what the confirmation page is built from (US-25). */
export type SubmittedApplicationRecord = {
  /** Global sequence, the variable symbol. */
  number: number
  firstName: string
  lastName: string
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

export type SubmissionRecord = {
  eventName: string
  /** Account number of the organization that runs the event. */
  bankAccount: string
  /** The applicant's e-mail. */
  email: string
  /** The account has no password yet — this submission created it. */
  mustSetPassword: boolean
  /** One per participant, in form order. */
  applications: SubmittedApplicationRecord[]
}

/** Where and how much to pay — only for an application with a confirmed term. */
export type ApplicationPayment = {
  bankAccount: string
  /** The application number, four digits. */
  variableSymbol: string
  /** Still to pay (due − paid), never negative. */
  amountCzk: number
}

export type SubmittedApplicationStatus = {
  firstName: string
  lastName: string
  /** Reference for people, `LK-0048`. */
  code: string
  variableSymbol: string
  terms: {
    termId: string
    name: string
    /** ISO dates, e.g. "2027-07-04". */
    startsOn: string
    endsOn: string
    status: ApplicationTermStatus
    priceCzk: number
  }[]
  paymentStatus: PaymentStatus
  /** `null` when every term is waitlisted: nothing to pay yet. */
  payment: ApplicationPayment | null
}

export type SubmissionStatus = {
  eventName: string
  email: string
  isNewAccount: boolean
  applications: SubmittedApplicationStatus[]
}

export const toVariableSymbol = (number: number): string => String(number).padStart(4, "0")

/** Reference for people — initials of the event and the number. Display only. */
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

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

/**
 * Status of one submission for its confirmation page. Every application has
 * its own amount and variable symbol (PO decision 2026-10-21, docs/PROJEKT.md)
 * — nothing is summed across participants. A waitlisted term is only "waiting
 * for confirmation": the place in line is never part of this type.
 */
export function buildSubmissionStatus(record: SubmissionRecord): SubmissionStatus {
  return {
    eventName: record.eventName,
    email: record.email,
    isNewAccount: record.mustSetPassword,
    applications: record.applications.map((application) => {
      const amountDue = computeAmountDue(application.terms)
      const amountPaid = computeAmountPaid(application.payments)
      const variableSymbol = toVariableSymbol(application.number)

      return {
        firstName: application.firstName,
        lastName: application.lastName,
        code: toApplicationCode(record.eventName, application.number),
        variableSymbol,
        terms: [...application.terms]
          .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime())
          .map((term) => ({
            termId: term.termId,
            name: term.name,
            startsOn: toIsoDate(term.startsOn),
            endsOn: toIsoDate(term.endsOn),
            status: term.status,
            priceCzk: term.priceCzk,
          })),
        paymentStatus: computePaymentStatus(amountDue, amountPaid),
        payment: application.terms.some((term) => term.status === "CONFIRMED")
          ? {
              bankAccount: record.bankAccount,
              variableSymbol,
              amountCzk: Math.max(computeAmountOwed(amountDue, amountPaid), 0),
            }
          : null,
      }
    }),
  }
}
