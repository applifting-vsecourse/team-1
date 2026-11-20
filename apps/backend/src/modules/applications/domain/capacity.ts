import { emptyGenderCounts, Gender, GenderCounts, GENDERS } from "@/shared/domain/gender"

export type RoomCapacity = {
  capacity: number
  /** Extra beds (přistýlky) of the room in its term, each one more bed (US-80). */
  extraBeds: number
  gender: Gender | null
  /**
   * Individual (mixed, family) room (US-145): has no gender, so its beds count into the capacity
   * of a gender by occupancy, one for each confirmed participant of that gender who sleeps there.
   */
  individual?: boolean
  /**
   * Confirmed participants assigned to the room, as the database returns them; read only for
   * individual rooms (see `ROOM_CAPACITY_SELECT`).
   */
  assignments?: { applicationTerm: { application: { gender: Gender } } }[]
}

/** The rooms with a say in the mode and in the capacity by gender: all but the individual ones. */
function regularRooms(rooms: RoomCapacity[]): RoomCapacity[] {
  return rooms.filter((room) => !room.individual)
}

/** Genders of the confirmed participants sleeping in individual rooms (US-145, variant b). */
function individualOccupants(rooms: RoomCapacity[]): Gender[] {
  return rooms
    .filter((room) => room.individual)
    .flatMap((room) =>
      (room.assignments ?? []).map((row) => row.applicationTerm.application.gender),
    )
}

/**
 * Whether the term's rooms are shared, that is without a gender. Individual rooms (US-145) have
 * none in either mode, so they never decide it; the only place that tells the two apart by rooms.
 */
export function hasSharedRooms(rooms: RoomCapacity[]): boolean {
  return regularRooms(rooms).some((room) => room.gender === null)
}

/** All beds of individual rooms; only the occupied ones are in the capacity (`individualOccupants`). */
export function computeIndividualBeds(rooms: RoomCapacity[]): number {
  return rooms
    .filter((room) => room.individual)
    .reduce((sum, room) => sum + computeRoomBeds(room), 0)
}

/** Beds of one room: its own beds plus its extra beds. The only place that adds them up. */
export function computeRoomBeds(room: Pick<RoomCapacity, "capacity" | "extraBeds">): number {
  return room.capacity + room.extraBeds
}

/** Beds of a room still free once `assignedCount` people sleep in it (US-35). Not clamped: an overfilled room is negative. */
export function computeFreeRoomBeds(
  room: Pick<RoomCapacity, "capacity" | "extraBeds">,
  assignedCount: number,
): number {
  return computeRoomBeds(room) - assignedCount
}

/**
 * Capacity of a term (US-26): women = beds in women's rooms, men = beds in
 * men's rooms, plus the confirmed people who sleep in individual rooms (US-145, by their gender). Rooms belong to one term (US-99), so every term has its own
 * capacity; the shared mode has one common pool instead (`computeRoomCapacity`).
 */
export function computeTermCapacity(rooms: RoomCapacity[]): GenderCounts {
  const capacity = emptyGenderCounts()
  for (const room of regularRooms(rooms)) {
    if (room.gender !== null) capacity[room.gender] += computeRoomBeds(room)
  }
  for (const gender of individualOccupants(rooms)) capacity[gender] += 1
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
    total:
      regularRooms(rooms).reduce((sum, room) => sum + computeRoomBeds(room), 0) +
      individualOccupants(rooms).length,
  }
}

/** Shared rooms serve all genders from one pool. Existing confirmations keep their places. */
export function computeAvailablePlaces(rooms: RoomCapacity[], confirmed: Gender[]): GenderCounts {
  if (hasSharedRooms(rooms)) {
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
