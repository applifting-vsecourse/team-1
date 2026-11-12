import { emptyGenderCounts, Gender, GenderCounts, GENDERS } from "@/shared/domain/gender"

export type RoomCapacity = {
  capacity: number
  /** Extra beds (přistýlky) of the room in its term, each one more bed (US-80). */
  extraBeds: number
  gender: Gender | null
}

/** Beds of one room: its own beds plus its extra beds. The only place that adds them up. */
export function computeRoomBeds(room: Pick<RoomCapacity, "capacity" | "extraBeds">): number {
  return room.capacity + room.extraBeds
}

/**
 * Capacity of a term (US-26): women = beds in women's rooms, men = beds in
 * men's rooms. Rooms belong to one term (US-99), so every term has its own
 * capacity; the shared mode has one common pool instead (`computeRoomCapacity`).
 */
export function computeTermCapacity(rooms: RoomCapacity[]): GenderCounts {
  const capacity = emptyGenderCounts()
  for (const room of rooms) {
    if (room.gender !== null) capacity[room.gender] += computeRoomBeds(room)
  }
  return capacity
}

/** All beds of a term, whatever the gender — the capacity the organizer sees in lists. */
export function computeTotalBeds(rooms: RoomCapacity[]): number {
  return computeRoomCapacity(rooms).total
}

export function countByGender(items: { gender: Gender }[]): GenderCounts {
  const counts = emptyGenderCounts()
  for (const item of items) counts[item.gender] += 1
  return counts
}

/**
 * Free places = capacity − confirmed, per gender. Deliberately not clamped at
 * zero: removing a room may leave a term overbooked, which the organizer must
 * see (docs/PROJEKT.md, section 9).
 */
export function computeFreePlaces(capacity: GenderCounts, confirmed: GenderCounts): GenderCounts {
  const free = emptyGenderCounts()
  for (const gender of GENDERS) free[gender] = capacity[gender] - confirmed[gender]
  return free
}

/** A shared bed is counted once in total, never once per gender. */
export function computeRoomCapacity(rooms: RoomCapacity[]): GenderCounts & { total: number } {
  return {
    ...computeTermCapacity(rooms),
    total: rooms.reduce((sum, room) => sum + computeRoomBeds(room), 0),
  }
}

/** Shared rooms serve all genders from one pool. Existing confirmations keep their places. */
export function computeAvailablePlaces(rooms: RoomCapacity[], confirmed: Gender[]): GenderCounts {
  if (rooms.some((room) => room.gender === null)) {
    const free = computeRoomCapacity(rooms).total - confirmed.length
    return { FEMALE: free, MALE: free }
  }
  return computeFreePlaces(
    computeTermCapacity(rooms),
    countByGender(confirmed.map((gender) => ({ gender }))),
  )
}

/** Free beds of a term in shared rooms: all beds minus all confirmed, whatever the gender. Not clamped. */
export function computeSharedFreePlaces(rooms: RoomCapacity[], confirmedCount: number): number {
  return computeRoomCapacity(rooms).total - confirmedCount
}
