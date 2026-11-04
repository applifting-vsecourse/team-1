import { inReceiptOrder } from "@/modules/applications/domain/bulk-confirmation"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/** What the organizer decides about the selected applications waiting for evaluation (US-108). */
export type BulkDecision = "WAITLIST" | "REJECT"

/** The status an application moves to: K vyhodnocení → Náhradník, or → Zrušená (rejection). */
export const DECISION_TARGET = {
  WAITLIST: "WAITLISTED",
  REJECT: "CANCELLED",
} as const satisfies Record<BulkDecision, ApplicationTermStatus>

/** A selected application of the term with the status it has now. */
export type DecisionCandidate = {
  applicationId: string
  status: ApplicationTermStatus
  submittedAt: Date
  /** Application number, the tie-breaker of equal arrival times. */
  number: number
}

export type BulkDecisionPlan = {
  /** Still waiting for evaluation, in order of receipt. */
  changeable: string[]
  /** Another status, or not an application of the term: stays as it is. */
  skipped: string[]
}

/**
 * Which of the selected applications a bulk decision changes: only those still waiting for
 * evaluation (K vyhodnocení) in the term, in order of receipt. Everything else, including ids
 * that are not applications of the term, is left out.
 */
export function planBulkDecision(
  candidates: DecisionCandidate[],
  selectedIds: string[],
): BulkDecisionPlan {
  const changeable = inReceiptOrder(
    candidates.filter((candidate) => candidate.status === "TO_EVALUATE"),
  ).map((candidate) => candidate.applicationId)
  const changeableSet = new Set(changeable)
  return {
    changeable,
    skipped: [...new Set(selectedIds)].filter((id) => !changeableSet.has(id)),
  }
}
