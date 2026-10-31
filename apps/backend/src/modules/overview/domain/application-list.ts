import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePaymentStatus,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"
import { toVariableSymbol } from "@/modules/applications/domain/submission-status"
import {
  bedGroup,
  RoomMode,
  waitlistKey,
  waitlistPositions,
} from "@/modules/applications/domain/waitlist"
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

export type ApplicationListEntry = Omit<ListedApplication, "payments" | "number" | "terms"> & {
  terms: (ListedApplication["terms"][number] & {
    /** 1-based place in the waitlist of the term and bed group; null unless waitlisted (US-30). */
    waitlistPosition: number | null
  })[]
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  paymentStatus: PaymentStatus
}

export function applicationList(
  rows: ListedApplication[],
  filters: ApplicationFilters,
  roomMode: RoomMode = "GENDERED",
): ApplicationListEntry[] {
  // The place in the waitlist is counted before filtering, so a filter never renumbers the queue.
  const positions = waitlistPositions(
    rows.flatMap((row) =>
      row.terms.map((term) => ({
        applicationId: row.id,
        termId: term.id,
        gender: row.gender,
        status: term.status,
        submittedAt: row.submittedAt,
        number: row.number,
      })),
    ),
    roomMode,
  )
  const positionOf = (row: ListedApplication, termId: string): number | null =>
    positions.get(waitlistKey(row.id, termId)) ?? null
  const isWaitlistView = filters.status === "WAITLISTED" && filters.termId !== undefined
  const normalize = (value: string): string =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  const words = normalize(filters.q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const entries = rows
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
        terms: row.terms.map((term) => ({ ...term, waitlistPosition: positionOf(row, term.id) })),
        amountDueCzk,
        amountPaidCzk,
        amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
        paymentStatus: computePaymentStatus(amountDueCzk, amountPaidCzk),
      }
    })
    .filter((row) => filters.payment === undefined || row.paymentStatus === filters.payment)
  if (!isWaitlistView) return entries
  // One term's waitlist: each bed group in the order of receipt (US-30).
  const place = (entry: ApplicationListEntry): number =>
    entry.terms.find((term) => term.id === filters.termId)?.waitlistPosition ?? 0
  return entries.sort(
    (a, b) =>
      bedGroup(roomMode, a.gender).localeCompare(bedGroup(roomMode, b.gender)) ||
      place(a) - place(b),
  )
}
