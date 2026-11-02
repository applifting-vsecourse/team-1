import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { Gender } from "@/shared/domain/gender"

export type RoomMode = "GENDERED" | "SHARED"
export type Room = RoomCapacity & { id: string; name: string }
export type RoomInput = Omit<Room, "id">
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
