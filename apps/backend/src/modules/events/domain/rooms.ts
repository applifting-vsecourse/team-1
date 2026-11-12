import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { Gender } from "@/shared/domain/gender"

export type RoomMode = "GENDERED" | "SHARED"
/** `beds` = `capacity` + `extraBeds`, computed by `computeRoomBeds`; clients only display it. */
export type Room = RoomCapacity & { id: string; name: string; beds: number }
/** What the organizer edits in a room; extra beds have their own action. */
export type RoomInput = Omit<Room, "id" | "extraBeds" | "beds">
/** What a copy does with rooms the target term already has: keep them and add, or remove them first. */
export type RoomCopyStrategy = "ADD" | "REPLACE"
/** Gender chosen for one existing room when the term switches to gendered rooms. */
export type RoomGenderAssignment = { id: string; gender: Gender }
/** Rooms of one term; the mode and the capacity belong to the term too (US-99). */
export type TermRooms = {
  eventId: string
  eventName: string
  organizationName: string
  termId: string
  termName: string | null
  /** ISO date, `2027-07-04`. */
  startsOn: string
  endsOn: string
  roomMode: RoomMode
  rooms: Room[]
  capacity: { FEMALE: number; MALE: number; total: number }
}
