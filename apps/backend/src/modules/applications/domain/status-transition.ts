import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { Gender, GenderCounts } from "@/shared/domain/gender"

/**
 * Manual status changes of an application in a term (US-28), from the state
 * diagram of the application in a term (docs/procesy/zpracovani-prihlasky):
 *
 * - Náhradník → Potvrzená s dluhem (confirm, the organizer when a bed frees up)
 * - Náhradník → Zrušená, Potvrzená → Zrušená (cancel)
 * - Zrušená is terminal.
 *
 * Potvrzená → Náhradník is not in the diagram, so it is not allowed.
 * The state "K vyhodnocení" (US-102) does not exist in the code yet.
 */
const MANUAL_TRANSITIONS: Record<ApplicationTermStatus, ApplicationTermStatus[]> = {
  WAITLISTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
}

/** Statuses an organizer may move an application in a term to, from `from`. */
export function manualTargets(from: ApplicationTermStatus): ApplicationTermStatus[] {
  return MANUAL_TRANSITIONS[from]
}

export function canChangeManually(from: ApplicationTermStatus, to: ApplicationTermStatus): boolean {
  return MANUAL_TRANSITIONS[from].includes(to)
}

/**
 * Confirming takes a bed of the applicant's gender; with none free it would
 * exceed the capacity of the term (US-26) and needs a conscious confirmation.
 * `freePlaces` comes from `computeAvailablePlaces` (capacity.ts).
 */
export function exceedsCapacityWhenConfirmed(gender: Gender, freePlaces: GenderCounts): boolean {
  return freePlaces[gender] < 1
}

/** Kind of the e-mail to the applicant after a change to `to` (docs/procesy/.../EMAILY.md). */
export function changeEmailKind(
  to: ApplicationTermStatus,
): "STATUS_CHANGED" | "WAITLISTED" | "REJECTED" {
  if (to === "CONFIRMED") return "STATUS_CHANGED"
  return to === "WAITLISTED" ? "WAITLISTED" : "REJECTED"
}
