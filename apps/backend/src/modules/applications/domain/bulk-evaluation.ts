import {
  BulkCandidate,
  planBulkConfirmation,
} from "@/modules/applications/domain/bulk-confirmation"
import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { Gender } from "@/shared/domain/gender"

export type BulkEvaluationPlan = {
  /** Fit into the free beds, in order of receipt. */
  confirm: string[]
  /** Do not fit; they become substitutes, in order of receipt. */
  waitlist: string[]
}

/**
 * What evaluating the selected applications of a term in one step does (US-140): the ones that
 * fit into the free beds of their gender are confirmed in order of receipt (the same plan as the
 * bulk confirmation, US-107), every other one goes to the waitlist, so none is left waiting for
 * evaluation. A pure preview of what the server does one status change at a time.
 */
export function planBulkEvaluation(
  rooms: RoomCapacity[],
  confirmedGenders: Gender[],
  candidates: BulkCandidate[],
): BulkEvaluationPlan {
  const { confirmable, skipped } = planBulkConfirmation(rooms, confirmedGenders, candidates)
  return { confirm: confirmable, waitlist: skipped }
}
