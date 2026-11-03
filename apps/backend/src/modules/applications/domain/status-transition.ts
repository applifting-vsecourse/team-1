import { computeAvailablePlaces, RoomCapacity } from "@/modules/applications/domain/capacity"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { Gender, GenderCounts } from "@/shared/domain/gender"

/**
 * Manual status changes of an application in a term (US-28), from the state
 * diagram of the application in a term (docs/procesy/zpracovani-prihlasky):
 *
 * - Náhradník → Potvrzená s dluhem (confirm, the organizer when a bed frees up)
 * - Náhradník → Zrušená, Potvrzená → Zrušená (cancel)
 * - Potvrzená → Náhradník (decided in PR #232, the diagram will follow)
 * - K vyhodnocení → Potvrzená / Náhradník / Zrušená (the organizer's decision, manual evaluation
 *   mode only, nothing leads back into the state; D-058)
 * - Zrušená is terminal.
 */
const MANUAL_TRANSITIONS: Record<ApplicationTermStatus, ApplicationTermStatus[]> = {
  TO_EVALUATE: ["CONFIRMED", "WAITLISTED", "CANCELLED"],
  WAITLISTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["WAITLISTED", "CANCELLED"],
  CANCELLED: [],
}

/**
 * Changes the system makes by itself (actor null), the same table for both evaluation modes:
 * Náhradník → Zrušená on the first day of the term (US-106). Anything else is not the system's
 * to do, so a job that read a waitlisted application a moment ago cannot cancel one an
 * organizer has confirmed meanwhile.
 */
const SYSTEM_TRANSITIONS: Record<ApplicationTermStatus, ApplicationTermStatus[]> = {
  TO_EVALUATE: [],
  WAITLISTED: ["CANCELLED"],
  CONFIRMED: [],
  CANCELLED: [],
}

/** Who asks for a change: an organizer by hand, or the system on its own. */
export type StatusChangeActor = "ORGANIZER" | "SYSTEM"

export function canChange(
  actor: StatusChangeActor,
  from: ApplicationTermStatus,
  to: ApplicationTermStatus,
): boolean {
  const table = actor === "SYSTEM" ? SYSTEM_TRANSITIONS : MANUAL_TRANSITIONS
  return table[from].includes(to)
}

/** Statuses an organizer may move an application in a term to, from `from`. */
export function manualTargets(from: ApplicationTermStatus): ApplicationTermStatus[] {
  return MANUAL_TRANSITIONS[from]
}

export function canChangeManually(from: ApplicationTermStatus, to: ApplicationTermStatus): boolean {
  return canChange("ORGANIZER", from, to)
}

/**
 * Confirming takes a bed of the applicant's gender; with none free it would
 * exceed the capacity of the term (US-26) and needs a conscious confirmation.
 * `freePlaces` comes from `computeAvailablePlaces` (capacity.ts).
 */
export function exceedsCapacityWhenConfirmed(gender: Gender, freePlaces: GenderCounts): boolean {
  return freePlaces[gender] < 1
}

/**
 * Kind of the e-mail to the applicant after a change from `from` to `to`; the number is the row
 * of docs/procesy/zpracovani-prihlasky/EMAILY.md.
 */
export function changeEmailKind(
  to: ApplicationTermStatus,
  from?: ApplicationTermStatus,
  actor: StatusChangeActor = "ORGANIZER",
):
  | "CONFIRMED"
  | "CONFIRMED_FROM_WAITLIST"
  | "WAITLISTED"
  | "WAITLISTED_AFTER_CONFIRMED"
  | "REJECTED"
  | "NO_BED_FREED"
  | "CANCELLED_BY_ORGANIZER" {
  if (to === "CONFIRMED") return from === "WAITLISTED" ? "CONFIRMED_FROM_WAITLIST" : "CONFIRMED"
  if (to === "WAITLISTED") return from === "CONFIRMED" ? "WAITLISTED_AFTER_CONFIRMED" : "WAITLISTED"
  if (from === "WAITLISTED") return actor === "SYSTEM" ? "NO_BED_FREED" : "CANCELLED_BY_ORGANIZER"
  return "REJECTED"
}

/** What a status change needs to know, read under the lock. */
export type StatusChangeSnapshot = {
  status: ApplicationTermStatus
  gender: Gender
  /** Rooms of the term the status changes in. */
  rooms: RoomCapacity[]
  /** Genders of everyone confirmed in the term now. */
  confirmedGenders: Gender[]
}

export type StatusChangeRejection = "INVALID_STATUS_TRANSITION" | "CAPACITY_EXCEEDED"

/**
 * Decides a manual change: null when allowed, else why not. Confirming beyond
 * the free beds is allowed only with the organizer's conscious confirmation.
 */
export function rejectStatusChange(
  snapshot: StatusChangeSnapshot,
  to: ApplicationTermStatus,
  isOverCapacityConfirmed: boolean,
  actor: StatusChangeActor = "ORGANIZER",
): StatusChangeRejection | null {
  if (!canChange(actor, snapshot.status, to)) return "INVALID_STATUS_TRANSITION"
  if (to === "CONFIRMED" && !isOverCapacityConfirmed) {
    const free = computeAvailablePlaces(snapshot.rooms, snapshot.confirmedGenders)
    if (exceedsCapacityWhenConfirmed(snapshot.gender, free)) return "CAPACITY_EXCEEDED"
  }
  return null
}
