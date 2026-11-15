import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { EvaluationMode } from "@/modules/applications/domain/evaluation-mode"
import {
  computeApplicationDue,
  computeApplicationPaid,
} from "@/modules/applications/domain/payment-details"
import {
  computeAmountOwed,
  computePaymentStatus,
  PaymentStatus,
  termHasDebt,
} from "@/modules/applications/domain/pricing"
import { eligibleSubstitutes } from "@/modules/applications/domain/substitutes"
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
  /** `FREE_BED`: waitlisted in a term with a free bed for them (US-51, US-104, US-31). */
  waitlist?: WaitlistFilter
}
export const WAITLIST_FILTERS = ["FREE_BED"] as const
export type WaitlistFilter = (typeof WAITLIST_FILTERS)[number]
/**
 * Every payment status can be filtered on, "nothing due" (a waitlisted application) too.
 * `DEBT` is an application with a confirmed term that is not fully paid, the participants of
 * the payments overview (US-45) and of the attention card (US-51).
 */
export type FilterablePaymentStatus = PaymentStatus | "DEBT"
export const FILTERABLE_PAYMENT_STATUSES: FilterablePaymentStatus[] = [
  "DEBT",
  "NOTHING_DUE",
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
  /** How the event evaluates applications (US-101). */
  evaluationMode: EvaluationMode
  terms: {
    id: string
    name: string | null
    startsOn: Date
    endsOn: Date
    /** Room mode of the term decides its waitlist queues (US-99, D-063). */
    roomMode: RoomMode
    /** Rooms of the term, from which its free beds are computed. */
    rooms: RoomCapacity[]
    status: ApplicationTermStatus
    priceCzk: number
    /** `Term.number`. */
    termNumber: number
    /** Non-cancelled payment rows of this application in this term. */
    payments: { amountCzk: number }[]
  }[]
}

export type ApplicationListEntry = Omit<
  ListedApplication,
  "number" | "terms" | "evaluationMode"
> & {
  terms: (Omit<ListedApplication["terms"][number], "payments" | "termNumber" | "rooms"> & {
    /** 1-based place in the waitlist of the term and bed group; null unless waitlisted (US-30). */
    waitlistPosition: number | null
  })[]
  amountDueCzk: number
  amountPaidCzk: number
  amountOwedCzk: number
  paymentStatus: PaymentStatus
}

/** The summary variable symbol and the symbol of every term, so any of them finds the application. */
const searchableSymbols = (row: ListedApplication): string =>
  [
    variableSymbol(row.number),
    ...row.terms.map((term) => variableSymbol(row.number, term.termNumber)),
  ].join(" ")

/**
 * Applications waitlisted in a term that has a free bed for them: the ones the
 * organizer can approve now. The single predicate of the list filter and of the card "Náhradníci
 * k vyřešení" (US-51). Free beds come from `eligibleSubstitutes`, the same as for US-104.
 */
export function approvableSubstituteIds(rows: ListedApplication[]): Set<string> {
  const ids = new Set<string>()
  const termIds = new Set(rows.flatMap((row) => row.terms.map((term) => term.id)))
  for (const termId of termIds) {
    const members = rows.flatMap((row) =>
      row.terms.filter((term) => term.id === termId).map((term) => ({ row, term })),
    )
    const rooms = members[0]!.term.rooms
    // Both evaluation modes (US-31): the automatic one fills only the beds an action freed, a bed
    // that a bigger capacity made is left to the organizer.
    const candidates = members.map(({ row, term }) => ({
      applicationId: row.id,
      termId,
      roomMode: term.roomMode,
      gender: row.gender,
      status: term.status,
      submittedAt: row.submittedAt,
      number: row.number,
    }))
    const confirmedGenders = members
      .filter(({ term }) => term.status === "CONFIRMED")
      .map(({ row }) => row.gender)
    for (const { applicationId } of eligibleSubstitutes({ rooms, confirmedGenders }, candidates))
      ids.add(applicationId)
  }
  return ids
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
  // The queue of applications to evaluate goes from the oldest, so they are decided fairly (US-103).
  const isQueue = filters.status === "TO_EVALUATE"
  const ordered = isQueue
    ? [...rows].sort(
        (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.number - b.number,
      )
    : rows
  const approvable = filters.waitlist === "FREE_BED" ? approvableSubstituteIds(rows) : null
  const entries = ordered
    .filter(
      (row) =>
        (!approvable || approvable.has(row.id)) &&
        words.every((word) =>
          normalize(
            `${row.firstName} ${row.lastName} ${row.email} ${searchableSymbols(row)}`,
          ).includes(word),
        ) &&
        (!filters.gender || row.gender === filters.gender) &&
        (filters.payment !== "DEBT" ||
          row.terms.some((term) =>
            termHasDebt({ status: term.status, priceCzk: term.priceCzk }, term.payments),
          )) &&
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
    .filter(
      (row) =>
        filters.payment === undefined ||
        filters.payment === "DEBT" ||
        row.paymentStatus === filters.payment,
    )
  if (!isWaitlistView) return entries
  // One term's waitlist: each bed group in the order of receipt (US-30).
  const termOf = (entry: ApplicationListEntry) =>
    entry.terms.find((term) => term.id === filters.termId)
  const place = (entry: ApplicationListEntry): number => termOf(entry)?.waitlistPosition ?? 0
  const group = (entry: ApplicationListEntry): string =>
    bedGroup(termOf(entry)?.roomMode ?? "GENDERED", entry.gender)
  return entries.sort((a, b) => group(a).localeCompare(group(b)) || place(a) - place(b))
}
