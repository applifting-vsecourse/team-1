import { computeAvailablePlaces, RoomCapacity } from "@/modules/applications/domain/capacity"
import { exceedsCapacityWhenConfirmed } from "@/modules/applications/domain/status-transition"
import { Gender } from "@/shared/domain/gender"

/** A selected application waiting for evaluation in the term (US-107). */
export type BulkCandidate = {
  applicationId: string
  gender: Gender
  submittedAt: Date
  /** Application number, the tie-breaker of equal arrival times. */
  number: number
}

/** Order of receipt: the earlier arrival is decided first (docs/PROJEKT.md, "Termíny se vyhodnocují v pořadí přijetí"). */
export function inReceiptOrder<T extends { submittedAt: Date; number: number }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.number - b.number,
  )
}

export type BulkConfirmationPlan = {
  /** Fit into the free beds, in order of receipt. */
  confirmable: string[]
  /** Do not fit; they stay as they are. */
  skipped: string[]
}

/**
 * Which of the selected applications a bulk confirmation confirms: in order of receipt, each one
 * takes a bed of its gender (capacity.ts), and one that finds none is left out without blocking
 * the later ones, who may fit in another gender's bed. A pure preview of what the server does
 * one confirmation at a time (`TermStatusService.applyChange`).
 */
export function planBulkConfirmation(
  rooms: RoomCapacity[],
  confirmedGenders: Gender[],
  candidates: BulkCandidate[],
): BulkConfirmationPlan {
  const confirmed = [...confirmedGenders]
  const plan: BulkConfirmationPlan = { confirmable: [], skipped: [] }
  for (const candidate of inReceiptOrder(candidates)) {
    if (exceedsCapacityWhenConfirmed(candidate.gender, computeAvailablePlaces(rooms, confirmed))) {
      plan.skipped.push(candidate.applicationId)
    } else {
      confirmed.push(candidate.gender)
      plan.confirmable.push(candidate.applicationId)
    }
  }
  return plan
}
