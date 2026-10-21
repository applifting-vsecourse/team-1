import { Gender } from "@/shared/domain/gender"
import { computeFreePlaces, computeTermCapacity, countByGender, RoomCapacity } from "./capacity"
import { evaluateApplication, EvaluatedTerm } from "./evaluation"

/** One participant of a submitted form, in the order of the form. */
export type SubmittedParticipant = {
  gender: Gender
  /** Selected terms with the price they have right now. */
  terms: { termId: string; priceCzk: number }[]
}

/** What the evaluation reads under the row lock (US-27). */
export type OccupancySnapshot = {
  /** Rooms of the event — they apply to every term of it (US-14). */
  rooms: RoomCapacity[]
  /** Gender of everyone already CONFIRMED, by term. */
  confirmedGenders: Record<string, Gender[]>
}

/**
 * Evaluates the participants of one submission in order, each confirmation
 * taking a bed from the next one, and every term separately. Capacity and
 * evaluation come from `capacity.ts` / `evaluation.ts`; this only walks the
 * participants.
 */
export function evaluateSubmission(
  participants: SubmittedParticipant[],
  snapshot: OccupancySnapshot,
): EvaluatedTerm[][] {
  const capacity = computeTermCapacity(snapshot.rooms)
  const confirmed = new Map<string, Gender[]>()
  const confirmedIn = (termId: string): Gender[] => {
    if (!confirmed.has(termId))
      confirmed.set(termId, [...(snapshot.confirmedGenders[termId] ?? [])])
    return confirmed.get(termId) as Gender[]
  }

  return participants.map((participant) => {
    const evaluated = evaluateApplication(
      participant.gender,
      participant.terms.map(({ termId, priceCzk }) => ({
        termId,
        priceCzk,
        freePlaces: computeFreePlaces(
          capacity,
          countByGender(confirmedIn(termId).map((gender) => ({ gender }))),
        ),
      })),
    )
    for (const term of evaluated) {
      if (term.status === "CONFIRMED") confirmedIn(term.termId).push(participant.gender)
    }
    return evaluated
  })
}

const EARLIEST_BIRTH_DATE = "1900-01-01"

/** `2014-05-18`: a real calendar day between 1900 and today. */
export function isValidBirthDate(iso: string, today = new Date()): boolean {
  const date = new Date(`${iso}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso &&
    iso >= EARLIEST_BIRTH_DATE &&
    iso <= today.toISOString().slice(0, 10)
  )
}
