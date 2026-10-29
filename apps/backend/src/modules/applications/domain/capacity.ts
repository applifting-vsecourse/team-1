import { emptyGenderCounts, Gender, GenderCounts, GENDERS } from "@/shared/domain/gender"

export type RoomCapacity = {
  capacity: number
  gender: Gender | null
}

/**
 * Capacity of a term (US-26): women = beds in women's rooms, men = beds in
 * men's rooms. Rooms belong to the event, so every term of it has the same
 * capacity in sprint 1.
 */
export function computeTermCapacity(rooms: RoomCapacity[]): GenderCounts {
  const capacity = emptyGenderCounts()
  for (const room of rooms) {
    if (room.gender !== null) capacity[room.gender] += room.capacity
  }
  return capacity
}

/** All beds of a term, women's + men's — the capacity the organizer sees in lists. */
export function computeTotalBeds(rooms: RoomCapacity[]): number {
  const { FEMALE, MALE } = computeTermCapacity(rooms)
  return FEMALE + MALE
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
    total: rooms.reduce((sum, room) => sum + room.capacity, 0),
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
