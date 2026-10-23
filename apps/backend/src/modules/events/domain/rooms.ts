import { RoomCapacity } from "@/modules/applications/domain/capacity"

export type RoomMode = "GENDERED" | "SHARED"
export type Room = RoomCapacity & { id: string; name: string }
export type RoomInput = Omit<Room, "id">
export type EventRooms = {
  eventId: string
  eventName: string
  organizationName: string
  roomMode: RoomMode
  termCount: number
  rooms: Room[]
  capacity: { FEMALE: number; MALE: number; total: number }
}
