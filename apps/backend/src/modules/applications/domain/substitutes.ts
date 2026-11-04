import { inReceiptOrder } from "@/modules/applications/domain/bulk-confirmation"
import { computeAvailablePlaces, RoomCapacity } from "@/modules/applications/domain/capacity"
import {
  bedGroup,
  BedGroup,
  WaitlistCandidate,
  waitlistKey,
  waitlistPositions,
} from "@/modules/applications/domain/waitlist"
import { GenderCounts } from "@/shared/domain/gender"

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
