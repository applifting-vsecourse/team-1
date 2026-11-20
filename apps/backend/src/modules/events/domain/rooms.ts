import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { Gender } from "@/shared/domain/gender"

export type RoomMode = "GENDERED" | "SHARED"
/** `beds` = `capacity` + `extraBeds`, computed by `computeRoomBeds`; clients only display it. */
export type Room = RoomCapacity & { id: string; name: string; beds: number; individual: boolean }
/** What the organizer edits in a room; extra beds have their own action. */
export type RoomInput = Omit<Room, "id" | "extraBeds" | "beds" | "individual" | "assignments"> & {
  /** Individual (mixed, family) room (US-145); false when left out. */
  individual?: boolean
}
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
  /** The room assignment is visible to the confirmed participants (US-144). */
  roomsPublished: boolean
  rooms: Room[]
  /** Capacity of the term; individual rooms (US-145) are outside it. */
  capacity: { FEMALE: number; MALE: number; total: number; individualBeds: number }
}
