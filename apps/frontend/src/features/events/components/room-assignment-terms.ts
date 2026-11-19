import { formatDateRange } from "@/lib/date"

import type { AssignmentOtherTerm } from "@/features/events/api/room-assignments"
import { sameRoomName } from "@/features/events/components/room-assignment-labels"

export const termLine = (term: { startsOn: string; endsOn: string }): string =>
  formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

/** "a", "a and b", "a, b and c": the separator word comes from the caller (it is translated). */
export const joinList = (items: string[], and: string): string =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`

/**
 * What the room picked in this term stands for in another term of the same application (D-111:
 * the room of the same name): a free bed there, a room that is full, or no such room.
 */
export type OtherTermOffer = {
  other: AssignmentOtherTerm
  state: "free" | "full" | "missing"
  match: AssignmentOtherTerm["rooms"][number] | null
}

export function otherTermOffers(
  alsoInTerms: readonly AssignmentOtherTerm[],
  roomName: string,
): OtherTermOffer[] {
  return alsoInTerms.map((other) => {
    const match = other.rooms.find((room) => sameRoomName(room.name, roomName)) ?? null
    return { other, match, state: !match ? "missing" : match.freeBeds > 0 ? "free" : "full" }
  })
}
