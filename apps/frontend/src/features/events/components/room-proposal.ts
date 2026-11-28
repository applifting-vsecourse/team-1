import type {
  AssignmentRoom,
  RoomProposal,
  RoomProposalWish,
} from "@/features/events/api/room-assignments"
import { freeBedCount } from "@/features/events/components/room-assignment-labels"

/** An unsaved proposal kept in the browser until the organizer confirms it (US-147). */
export type RoomDraft = {
  /** Proposed room of an application in the term, by `applicationTermId`; edits change it. */
  placements: Record<string, string>
  wishes: RoomProposalWish[]
  unplaced: RoomProposal["unplaced"]
}

export const toDraft = (proposal: RoomProposal): RoomDraft => ({
  placements: Object.fromEntries(
    proposal.placements.map((item) => [item.applicationTermId, item.roomId]),
  ),
  wishes: proposal.wishes,
  unplaced: proposal.unplaced,
})

/** Who is proposed into a room. */
export const proposedIn = (draft: RoomDraft, roomId: string): string[] =>
  Object.entries(draft.placements)
    .filter(([, room]) => room === roomId)
    .map(([id]) => id)

/** Beds left in a room once the draft is applied. */
export const draftFreeBeds = (room: AssignmentRoom, draft: RoomDraft): number =>
  Math.max(0, freeBedCount(room) - proposedIn(draft, room.id).length)

/** Wishes that stay unfulfilled: nobody the name stands for sleeps in the wisher's room. */
export function unfulfilledWishes(
  rooms: readonly AssignmentRoom[],
  draft: RoomDraft,
): RoomProposalWish[] {
  const roomOf = (id: string): string | undefined =>
    draft.placements[id] ??
    rooms.find((room) => room.participants.some((p) => p.applicationTermId === id))?.id
  return draft.wishes.filter((wish) => {
    const own = roomOf(wish.applicationTermId)
    return own === undefined || !wish.matches.some((match) => roomOf(match) === own)
  })
}

/** Free beds of the draft a participant of that gender can be moved to, other than their own room. */
export function movableBeds(
  rooms: readonly AssignmentRoom[],
  draft: RoomDraft,
  person: { applicationTermId: string; gender: "FEMALE" | "MALE" },
): { room: AssignmentRoom; number: number }[] {
  const own = draft.placements[person.applicationTermId]
  return (
    rooms
      // Individual rooms and rooms used for an individual accommodation request stay manual.
      .filter(
        (room) =>
          room.id !== own &&
          !room.individual &&
          !room.participants.some((participant) => participant.individualAccommodation) &&
          (room.gender === null || room.gender === person.gender),
      )
      .flatMap((room) => {
        const taken = room.participants.length + proposedIn(draft, room.id).length
        return Array.from({ length: draftFreeBeds(room, draft) }, (_, index) => ({
          room,
          number: taken + index + 1,
        }))
      })
  )
}
