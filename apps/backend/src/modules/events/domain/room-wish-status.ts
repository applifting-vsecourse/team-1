import { ApplicationTermStatus, isAssignable } from "@/modules/applications/domain/evaluation"
import { normalizeName } from "@/shared/domain/room-wishes"

export const ROOM_WISH_STATUSES = ["fulfilled", "unfulfilled", "impossible"] as const

export type RoomWishStatus = {
  name: string
  status: (typeof ROOM_WISH_STATUSES)[number]
  roomName: string | null
}

/**
 * Whose name in a wish counts as "in the applications of the term". OPEN BUSINESS QUESTION (see the
 * PR): the docs only say who can sleep in a room (confirmed or to-evaluate), not who a wish may
 * name, so this is the most conservative reading. Change it here only.
 */
export function isWishableStatus(status: ApplicationTermStatus): boolean {
  return isAssignable(status)
}

type Room = { id: string; name: string }
type Candidate = {
  applicationTermId: string
  firstName: string
  lastName: string
  room: Room | null
}

/** The caller provides the eligible roster of the selected term. */
export function createRoomWishEvaluator(candidates: readonly Candidate[]) {
  const byName = new Map<string, Candidate[]>()
  for (const candidate of candidates) {
    const { firstName, lastName } = candidate
    const keys = new Set([
      normalizeName(`${firstName} ${lastName}`),
      normalizeName(`${lastName} ${firstName}`),
    ])
    for (const key of keys) {
      const matches = byName.get(key)
      if (matches) matches.push(candidate)
      else byName.set(key, [candidate])
    }
  }

  return (
    wishes: readonly string[],
    author: { applicationTermId: string; room: Room | null },
  ): RoomWishStatus[] =>
    wishes.map((name) => {
      const matches = (byName.get(normalizeName(name)) ?? []).filter(
        ({ applicationTermId }) => applicationTermId !== author.applicationTermId,
      )
      if (matches.length === 0) return { name, status: "impossible", roomName: null }

      if (author.room && matches.some(({ room }) => room?.id === author.room?.id)) {
        return { name, status: "fulfilled", roomName: author.room.name }
      }

      return {
        name,
        status: "unfulfilled",
        // An ambiguous name cannot identify one specific room.
        roomName: matches.length === 1 ? (matches[0]?.room?.name ?? null) : null,
      }
    })
}
