import { computeAvailablePlaces } from "@/modules/applications/domain/capacity"
import { EvaluatedTerm } from "@/modules/applications/domain/evaluation"
import { OccupancySnapshot } from "@/modules/applications/domain/submission"
import { Gender } from "@/shared/domain/gender"

export type ManualTermChoice = {
  termId: string
  priceCzk: number
  status: "CONFIRMED" | "WAITLISTED"
}

/** A manual confirmation uses the same bed calculation as a status change. */
export function evaluateManualSubmission(
  choices: ManualTermChoice[],
  gender: Gender,
  snapshot: OccupancySnapshot,
): { terms: EvaluatedTerm[]; overCapacity: string[] } {
  const overCapacity = choices
    .filter(
      ({ termId, status }) =>
        status === "CONFIRMED" &&
        computeAvailablePlaces(
          snapshot.roomsByTerm[termId] ?? [],
          snapshot.confirmedGenders[termId] ?? [],
        )[gender] < 1,
    )
    .map(({ termId }) => termId)
  return {
    terms: choices.map(({ termId, priceCzk, status }) => ({ termId, priceCzk, status })),
    overCapacity,
  }
}
