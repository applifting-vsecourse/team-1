import { inReceiptOrder } from "@/modules/applications/domain/bulk-confirmation"
import { computeAvailablePlaces, RoomCapacity } from "@/modules/applications/domain/capacity"
import {
  bedGroup,
  BedGroup,
  WaitlistCandidate,
  waitlistKey,
  waitlistPositions,
} from "@/modules/applications/domain/waitlist"
import { Gender, GenderCounts } from "@/shared/domain/gender"

/** What decides who may take a freed bed in a term (US-104). */
export type SubstituteTerm = {
  rooms: RoomCapacity[]
  /** Genders of everyone confirmed in the term now. */
  confirmedGenders: WaitlistCandidate["gender"][]
}

export type EligibleSubstitute = {
  applicationId: string
  /** Position in the waitlist of the bed group (US-30), not among the eligible ones. */
  position: number
  group: BedGroup
}

/** Free beds of the term per gender; in shared rooms both numbers are the one common pool. */
export function freeBedsOf(term: SubstituteTerm): GenderCounts {
  return computeAvailablePlaces(term.rooms, term.confirmedGenders)
}

/**
 * Waitlisted applications a freed bed is for, in order of receipt (US-104): those whose bed
 * group has a free bed. Shared rooms have one queue (D-063), gendered ones one per gender.
 * The positions come from `waitlistPositions`, so the order is the one of the waitlist (US-30).
 * No free bed → nobody. Confirming someone else than the first is up to the organizer.
 */
export function eligibleSubstitutes(
  term: SubstituteTerm,
  waitlisted: WaitlistCandidate[],
): EligibleSubstitute[] {
  const free = freeBedsOf(term)
  const positions = waitlistPositions(waitlisted)
  return inReceiptOrder(waitlisted.filter((candidate) => candidate.status === "WAITLISTED"))
    .filter((candidate) => free[candidate.gender] >= 1)
    .map((candidate) => ({
      applicationId: candidate.applicationId,
      position: positions.get(waitlistKey(candidate.applicationId, candidate.termId))!,
      group: bedGroup(candidate.roomMode, candidate.gender),
    }))
}

/**
 * Whom a freed bed is offered to (US-31): the first eligible substitute of each bed group. In
 * the automatic evaluation mode the system confirms them, in the manual one the organizer is
 * shown them as the proposal. Gendered rooms have one queue per gender, so up to two; shared
 * rooms have one. In order of receipt.
 */
export function proposedSubstitutes(
  term: SubstituteTerm,
  waitlisted: WaitlistCandidate[],
): EligibleSubstitute[] {
  const seen = new Set<BedGroup>()
  return eligibleSubstitutes(term, waitlisted).filter((row) => {
    if (seen.has(row.group)) return false
    seen.add(row.group)
    return true
  })
}

/** A bed that a status change or a change of terms has just given up (US-31). */
export type FreedBed = { termId: string; gender: Gender }

/**
 * Who takes one freed bed in the automatic evaluation mode (US-31): the first eligible substitute
 * of the bed group of the one that left, not of any other group. So a bed that was free before
 * (an organizer's added one, left empty on purpose) is never taken by a substitute of another
 * group, and one freed bed takes at most one substitute. `except` is an application that must
 * not take it, the one the organizer has just moved to the waitlist.
 */
export function substituteForFreedBed(
  term: SubstituteTerm,
  waitlisted: WaitlistCandidate[],
  group: BedGroup,
  except?: string,
): EligibleSubstitute | undefined {
  return proposedSubstitutes(
    term,
    waitlisted.filter((candidate) => candidate.applicationId !== except),
  ).find((row) => row.group === group)
}
