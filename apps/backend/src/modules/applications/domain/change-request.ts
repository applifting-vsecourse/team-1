export type ChangeRequest = {
  id: string
  applicationId: string
  eventId: string
  eventName: string
  applicantId: string
  email: string
  locale: "en" | "cs"
  participantName: string
  participantGender: "FEMALE" | "MALE"
  currentTermIds: string[]
  requestedTermIds: string[]
  currentPriceCzk: number
  requestedPriceCzk: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason: string | null
  createdAt: Date
  reviewedAt: Date | null
  terms: { id: string; name: string | null; startsOn: Date; endsOn: Date; priceCzk: number }[]
}

export const sameSelection = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id) => right.includes(id))

export const selectionPriceCzk = (
  termIds: readonly string[],
  terms: readonly { id: string; priceCzk: number }[],
): number =>
  termIds.reduce((sum, id) => sum + (terms.find((term) => term.id === id)?.priceCzk ?? 0), 0)

export function termChangeApprovalPolicy(
  eventMode: "AUTOMATIC" | "MANUAL",
  approvedRequest: boolean,
  gender: "FEMALE" | "MALE",
  addedTerms: readonly { freePlaces: { FEMALE: number; MALE: number } }[],
): { evaluationMode: "AUTOMATIC" | "MANUAL"; hasCapacity: boolean } {
  return {
    evaluationMode: approvedRequest ? "AUTOMATIC" : eventMode,
    hasCapacity: !approvedRequest || addedTerms.every((term) => term.freePlaces[gender] > 0),
  }
}
