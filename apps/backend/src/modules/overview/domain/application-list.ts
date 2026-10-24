import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePaymentStatus,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"
import { Gender } from "@/shared/domain/gender"

export type ApplicationFilters = {
  termId?: string
  status?: ApplicationTermStatus
  gender?: Gender
  paid?: "true" | "false"
}
export type ListedApplication = {
  id: string
  firstName: string
  lastName: string
  birthDate: Date
  gender: Gender
  email: string
  submittedAt: Date
  terms: {
    id: string
    name: string
    startsOn: Date
    endsOn: Date
    status: ApplicationTermStatus
    priceCzk: number
  }[]
  payments: { amountCzk: number }[]
}

export type ApplicationListEntry = Omit<ListedApplication, "payments"> & {
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  paymentStatus: PaymentStatus
}

export function applicationList(
  rows: ListedApplication[],
  filters: ApplicationFilters,
): ApplicationListEntry[] {
  return rows
    .filter(
      (row) =>
        (!filters.gender || row.gender === filters.gender) &&
        (!(filters.termId || filters.status) ||
          row.terms.some(
            (term) =>
              (!filters.termId || term.id === filters.termId) &&
              (!filters.status || term.status === filters.status),
          )),
    )
    .map(({ payments, ...row }) => {
      const amountDueCzk = computeAmountDue(row.terms)
      const amountPaidCzk = computeAmountPaid(payments)
      return {
        ...row,
        amountDueCzk,
        amountPaidCzk,
        amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
        paymentStatus: computePaymentStatus(amountDueCzk, amountPaidCzk),
      }
    })
    .filter(
      (row) =>
        filters.paid === undefined ||
        (filters.paid === "true" ? row.amountOwedCzk <= 0 : row.amountOwedCzk > 0),
    )
}
