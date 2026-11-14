import { computeRoomBeds } from "@/modules/applications/domain/capacity"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { Gender } from "@/shared/domain/gender"

/**
 * Who can sleep in a room (US-35): a confirmed application in the term, or one still waiting for
 * the manual evaluation (the assignment confirms nothing). Waitlisted and cancelled ones cannot.
 */
export const ASSIGNABLE_STATUSES: readonly ApplicationTermStatus[] = ["CONFIRMED", "TO_EVALUATE"]

export function isAssignable(status: ApplicationTermStatus): boolean {
  return ASSIGNABLE_STATUSES.includes(status)
}

/** Free beds of a room: all its beds (own + extra beds, US-80) minus the people assigned. */
export function freeBeds(
  room: { capacity: number; extraBeds: number },
  assignedCount: number,
): number {
  return computeRoomBeds(room) - assignedCount
}

export type AssignmentRejection = "ROOM_ASSIGNMENT_STATUS_INVALID" | "ROOM_FULL"

/**
 * Why an application in a term cannot be put into a room, or null. Gender is not checked (a mixed
 * room is a warning of US-37) and a full room is never overfilled here. Putting
 * someone into the room they are in already is a no-op, so it is never rejected as full.
 */
export function rejectAssignment(input: {
  status: ApplicationTermStatus
  room: { capacity: number; extraBeds: number }
  assignedCount: number
  alreadyInRoom: boolean
}): AssignmentRejection | null {
  if (!isAssignable(input.status)) return "ROOM_ASSIGNMENT_STATUS_INVALID"
  if (input.alreadyInRoom) return null
  return freeBeds(input.room, input.assignedCount) <= 0 ? "ROOM_FULL" : null
}

const normalize = (name: string): string => name.trim().toLocaleLowerCase("cs")

/**
 * The room of another term that stands for the same room (AC3): the one with the same name. Names
 * are unique per term regardless of case, and copying rooms between terms (US-100) keeps them.
 */
export function findSameNamedRoom<T extends { name: string }>(
  rooms: readonly T[],
  name: string,
): T | undefined {
  return rooms.find((room) => normalize(room.name) === normalize(name))
}

export type AssignmentParticipant = {
  applicationTermId: string
  applicationId: string
  firstName: string
  lastName: string
  gender: Gender
  status: ApplicationTermStatus
}

/**
 * Another term of the participant's application the same room can be assigned in (AC3): the
 * participant is assignable there and has no room yet. The client offers it when one of `rooms`
 * has the same name as the room being picked.
 */
export type AssignmentOtherTerm = {
  termId: string
  name: string | null
  /** ISO dates, `2027-07-04`. */
  startsOn: string
  endsOn: string
  rooms: { id: string; name: string; gender: Gender | null; freeBeds: number }[]
}

export type UnassignedParticipant = AssignmentParticipant & { alsoInTerms: AssignmentOtherTerm[] }

export type AssignmentRoom = {
  id: string
  name: string
  capacity: number
  extraBeds: number
  beds: number
  gender: Gender | null
  participants: AssignmentParticipant[]
}

export type TermAssignments = {
  eventId: string
  termId: string
  rooms: AssignmentRoom[]
  unassigned: UnassignedParticipant[]
}
