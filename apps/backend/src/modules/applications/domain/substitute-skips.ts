import {
  bedGroup,
  WaitlistCandidate,
  waitlistKey,
  waitlistPositions,
} from "@/modules/applications/domain/waitlist"

/**
 * Waitlisted applications skipped when `confirmed` is confirmed from the waitlist (US-105): those
 * in the same queue (term and bed group, one shared queue in shared rooms, D-063) that are ahead
 * of it in the order of receipt and stay on the waitlist. The order is `waitlistPositions` (US-30).
 * `waitlisted` is the waitlist as it is just before the confirmation; the confirmed one is in it.
 */
export function skippedSubstitutes(
  confirmed: Pick<WaitlistCandidate, "applicationId" | "termId">,
  waitlisted: WaitlistCandidate[],
): string[] {
  const positions = waitlistPositions(waitlisted)
  const own = positions.get(waitlistKey(confirmed.applicationId, confirmed.termId))
  const ownCandidate = waitlisted.find(
    (candidate) =>
      candidate.applicationId === confirmed.applicationId && candidate.termId === confirmed.termId,
  )
  if (own === undefined || !ownCandidate) return []
  const group = bedGroup(ownCandidate.roomMode, ownCandidate.gender)
  return waitlisted
    .filter(
      (candidate) =>
        candidate.termId === confirmed.termId &&
        bedGroup(candidate.roomMode, candidate.gender) === group &&
        (positions.get(waitlistKey(candidate.applicationId, candidate.termId)) ?? Infinity) < own,
    )
    .sort(
      (a, b) =>
        positions.get(waitlistKey(a.applicationId, a.termId))! -
        positions.get(waitlistKey(b.applicationId, b.termId))!,
    )
    .map((candidate) => candidate.applicationId)
}
