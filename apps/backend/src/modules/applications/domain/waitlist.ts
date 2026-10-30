import { Gender } from "@/shared/domain/gender"

export type RoomMode = "GENDERED" | "SHARED"

/**
 * The pool of beds a waitlisted application waits for: the beds of its gender in gendered rooms,
 * or the one common pool in shared rooms (US-30). Shared with the later filling of a freed bed.
 */
export type BedGroup = Gender | "SHARED"

export function bedGroup(roomMode: RoomMode, gender: Gender): BedGroup {
  return roomMode === "SHARED" ? "SHARED" : gender
}

export type WaitlistCandidate = {
  applicationId: string
  termId: string
  gender: Gender
  status: "CONFIRMED" | "WAITLISTED" | "CANCELLED"
  submittedAt: Date
  /** Tie-breaker for applications received at the same moment. */
  number: number
}

/** Key of one application in one term, as used by `waitlistPositions`. */
export const waitlistKey = (applicationId: string, termId: string): string =>
  `${applicationId}:${termId}`

/**
 * Position (1-based) of every waitlisted application in its term and bed group, in the order the
 * applications were received. Confirmed and cancelled applications are not in the queue, so
 * confirming or cancelling someone moves the rest up; nothing else does.
 */
export function waitlistPositions(
  candidates: WaitlistCandidate[],
  roomMode: RoomMode,
): Map<string, number> {
  const counters = new Map<string, number>()
  const positions = new Map<string, number>()
  const queue = candidates
    .filter((candidate) => candidate.status === "WAITLISTED")
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.number - b.number)
  for (const candidate of queue) {
    const group = `${candidate.termId}:${bedGroup(roomMode, candidate.gender)}`
    const position = (counters.get(group) ?? 0) + 1
    counters.set(group, position)
    positions.set(waitlistKey(candidate.applicationId, candidate.termId), position)
  }
  return positions
}
