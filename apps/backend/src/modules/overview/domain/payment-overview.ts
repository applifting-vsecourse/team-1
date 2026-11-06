import { computeOverviewPaymentDeadline } from "@/modules/applications/domain/payment-deadline"
import {
  computePayableAmount,
  computeTermOwed,
  computeTermPaid,
  computeTermPaymentStatus,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"

export type PaymentOverviewTerm = {
  applicationId: string
  firstName: string
  lastName: string
  termId: string
  termName: string | null
  startsOn: Date
  priceCzk: number
  evaluatedAt: Date
  confirmedAt: Date | null
  paymentPeriodStartedAt: Date | null
  paymentReminderSentAt: Date | null
  payments: { amountCzk: number }[]
}

export type PaymentOverviewEntry = {
  applicationId: string
  firstName: string
  lastName: string
  termId: string
  termName: string | null
  paymentStatus: PaymentStatus
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  paymentDueAt: Date
  overdue: boolean
  reminderCount: number
  lastReminderAt: Date | null
}

export type PaymentOverview = {
  totalDebtCzk: number
  debtorCount: number
  overdueCount: number
  entries: PaymentOverviewEntry[]
}

/** Each row is one confirmed application in a term; totals count debt, not overpayments. */
export function paymentOverview(
  terms: PaymentOverviewTerm[],
  paymentPeriodDays: number,
  now: Date,
): PaymentOverview {
  const entries = terms.map((term): PaymentOverviewEntry => {
    const current = { status: "CONFIRMED" as const, priceCzk: term.priceCzk }
    const amountPaidCzk = computeTermPaid(term.payments)
    const amountOwedCzk = computeTermOwed(current, term.payments)
    const paymentDueAt = computeOverviewPaymentDeadline({
      confirmedAt: term.confirmedAt ?? term.evaluatedAt,
      paymentPeriodStartedAt: term.paymentPeriodStartedAt,
      startsOn: term.startsOn,
      paymentPeriodDays,
    })
    return {
      applicationId: term.applicationId,
      firstName: term.firstName,
      lastName: term.lastName,
      termId: term.termId,
      termName: term.termName,
      paymentStatus: computeTermPaymentStatus(current, term.payments),
      amountDueCzk: term.priceCzk,
      amountPaidCzk,
      amountOwedCzk,
      paymentDueAt,
      overdue: amountOwedCzk > 0 && paymentDueAt.getTime() <= now.getTime(),
      reminderCount: term.paymentReminderSentAt === null ? 0 : 1,
      lastReminderAt: term.paymentReminderSentAt,
    }
  })
  entries.sort(
    (a, b) =>
      a.paymentDueAt.getTime() - b.paymentDueAt.getTime() ||
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName),
  )
  const debtors = new Set(
    entries.filter((entry) => entry.amountOwedCzk > 0).map((entry) => entry.applicationId),
  )
  const overdue = new Set(
    entries.filter((entry) => entry.overdue).map((entry) => entry.applicationId),
  )
  return {
    totalDebtCzk: computePayableAmount(entries.map((entry) => entry.amountOwedCzk)),
    debtorCount: debtors.size,
    overdueCount: overdue.size,
    entries,
  }
}
