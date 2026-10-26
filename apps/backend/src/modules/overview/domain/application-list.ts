import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePaymentStatus,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"
import { toVariableSymbol } from "@/modules/applications/domain/submission-status"
import { Gender } from "@/shared/domain/gender"

export type ApplicationFilters = {
  q?: string
  termId?: string
  status?: ApplicationTermStatus
  gender?: Gender
  payment?: FilterablePaymentStatus
}
/** Every payment status except "nothing due" can be filtered on (US-52). */
export type FilterablePaymentStatus = Exclude<PaymentStatus, "NOTHING_DUE">
export const FILTERABLE_PAYMENT_STATUSES: FilterablePaymentStatus[] = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "OVERPAID",
]
export type ListedApplication = {
  number: number
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

export type ApplicationListEntry = Omit<ListedApplication, "payments" | "number"> & {
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  paymentStatus: PaymentStatus
}

export function applicationList(
  rows: ListedApplication[],
  filters: ApplicationFilters,
): ApplicationListEntry[] {
  const normalize = (value: string): string =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  const words = normalize(filters.q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return rows
    .filter(
      (row) =>
        words.every((word) =>
          normalize(
            `${row.firstName} ${row.lastName} ${row.email} ${toVariableSymbol(row.number)}`,
          ).includes(word),
        ) &&
        (!filters.gender || row.gender === filters.gender) &&
        (!(filters.termId || filters.status) ||
          row.terms.some(
            (term) =>
              (!filters.termId || term.id === filters.termId) &&
              (!filters.status || term.status === filters.status),
          )),
    )
    .map((row) => {
      const amountDueCzk = computeAmountDue(row.terms)
      const amountPaidCzk = computeAmountPaid(row.payments)
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate,
        gender: row.gender,
        email: row.email,
        submittedAt: row.submittedAt,
        terms: row.terms,
        amountDueCzk,
        amountPaidCzk,
        amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
        paymentStatus: computePaymentStatus(amountDueCzk, amountPaidCzk),
      }
    })
    .filter((row) => filters.payment === undefined || row.paymentStatus === filters.payment)
}
