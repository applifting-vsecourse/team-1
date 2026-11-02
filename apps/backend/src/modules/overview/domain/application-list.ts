import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  computeApplicationDue,
  computeApplicationPaid,
} from "@/modules/applications/domain/payment-details"
import {
  computeAmountOwed,
  computePaymentStatus,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"
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
    /** Room mode of the term decides its waitlist queues (US-99, D-063). */
    roomMode: RoomMode
    status: ApplicationTermStatus
    priceCzk: number
    /** `Term.number`. */
    termNumber: number
    /** Non-cancelled payment rows of this application in this term. */
    payments: { amountCzk: number }[]
  }[]
}

export type ApplicationListEntry = Omit<ListedApplication, "number" | "terms"> & {
  terms: (Omit<ListedApplication["terms"][number], "payments" | "termNumber"> & {
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
): ApplicationListEntry[] {
  // The place in the waitlist is counted before filtering, so a filter never renumbers the queue.
  const positions = waitlistPositions(
    rows.flatMap((row) =>
      row.terms.map((term) => ({
        applicationId: row.id,
        termId: term.id,
        roomMode: term.roomMode,
        gender: row.gender,
        status: term.status,
        submittedAt: row.submittedAt,
        number: row.number,
      })),
    ),
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
            `${row.firstName} ${row.lastName} ${row.email} ${variableSymbol(row.number)}`,
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
      const amountDueCzk = computeApplicationDue(row.terms)
      const amountPaidCzk = computeApplicationPaid(row.terms)
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate,
        gender: row.gender,
        email: row.email,
        submittedAt: row.submittedAt,
        terms: row.terms.map((term) => ({
          id: term.id,
          name: term.name,
          startsOn: term.startsOn,
          endsOn: term.endsOn,
          roomMode: term.roomMode,
          status: term.status,
          priceCzk: term.priceCzk,
          waitlistPosition: positionOf(row, term.id),
        })),
        amountDueCzk,
        amountPaidCzk,
        amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
        paymentStatus: computePaymentStatus(amountDueCzk, amountPaidCzk),
      }
    })
    .filter((row) => filters.payment === undefined || row.paymentStatus === filters.payment)
  if (!isWaitlistView) return entries
  // One term's waitlist: each bed group in the order of receipt (US-30).
  const termOf = (entry: ApplicationListEntry) =>
    entry.terms.find((term) => term.id === filters.termId)
  const place = (entry: ApplicationListEntry): number => termOf(entry)?.waitlistPosition ?? 0
  const group = (entry: ApplicationListEntry): string =>
    bedGroup(termOf(entry)?.roomMode ?? "GENDERED", entry.gender)
  return entries.sort((a, b) => group(a).localeCompare(group(b)) || place(a) - place(b))
}
