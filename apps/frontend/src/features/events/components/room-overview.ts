import type {
  AssignmentParticipant,
  AssignmentRoom,
  UnassignedParticipant,
} from "@/features/events/api/room-assignments"

/** One line of a room in the overview: somebody sleeping there, or a bed nobody has. */
export type OverviewBed =
  | { kind: "taken"; participant: AssignmentParticipant; isExtra: boolean }
  | { kind: "free"; isExtra: boolean }

const byName = (a: AssignmentParticipant, b: AssignmentParticipant): number =>
  a.lastName.localeCompare(b.lastName, "cs") || a.firstName.localeCompare(b.firstName, "cs")

/**
 * The lines of one room. People are assigned to the room, not to a bed (D-111), so there is no bed
 * order to show: people by name first, the free beds after them. A line past the capacity is an
 * extra bed (D-139); a room filled over its beds still lists everybody.
 */
export function overviewBeds(room: AssignmentRoom): OverviewBed[] {
  const people = [...room.participants].sort(byName)
  const lines = Math.max(room.beds, people.length)
  return Array.from({ length: lines }, (_, index): OverviewBed => {
    const isExtra = index >= room.capacity
    const participant = people[index]
    return participant ? { kind: "taken", participant, isExtra } : { kind: "free", isExtra }
  })
}

export type OverviewTotals = { rooms: number; beds: number; occupied: number; free: number }

export function overviewTotals(rooms: readonly AssignmentRoom[]): OverviewTotals {
  const beds = rooms.reduce((sum, room) => sum + room.beds, 0)
  const occupied = rooms.reduce((sum, room) => sum + room.participants.length, 0)
  return { rooms: rooms.length, beds, occupied, free: Math.max(0, beds - occupied) }
}

/** Confirmed people without a room (2a); the ones still to evaluate are not listed here. */
export function confirmedWithoutRoom(
  unassigned: readonly UnassignedParticipant[],
): UnassignedParticipant[] {
  return unassigned.filter((person) => person.status === "CONFIRMED").sort(byName)
}
