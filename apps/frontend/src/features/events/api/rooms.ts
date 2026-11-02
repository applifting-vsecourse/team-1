import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const roomModeSchema = z.enum(["GENDERED", "SHARED"])
const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().int().min(1),
  gender: z.enum(["FEMALE", "MALE"]).nullable(),
})
const termRoomsSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  organizationName: z.string(),
  termId: z.string(),
  termName: z.string(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
  roomMode: roomModeSchema,
  rooms: z.array(roomSchema),
  capacity: z.object({ FEMALE: z.number().int(), MALE: z.number().int(), total: z.number().int() }),
})
export type Room = z.infer<typeof roomSchema>
export type RoomMode = z.infer<typeof roomModeSchema>
export type TermRooms = z.infer<typeof termRoomsSchema>
export type RoomInput = Omit<Room, "id">
/** Gender chosen for an existing room when a term switches to gendered rooms. */
export type RoomGender = { id: string; gender: "FEMALE" | "MALE" }

const base = (eventId: string, termId: string) =>
  `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}`

export const roomsQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: ["events", eventId, "rooms", termId],
    queryFn: async () =>
      termRoomsSchema.parse(await api.get(`${base(eventId, termId)}/rooms`).json()),
  })

export async function saveRoom(
  eventId: string,
  termId: string,
  input: RoomInput,
  id?: string,
): Promise<void> {
  const path = `${base(eventId, termId)}/rooms${id ? `/${encodeURIComponent(id)}` : ""}`
  if (id) await api.put(path, { json: input })
  else await api.post(path, { json: input })
}
export async function deleteRoom(eventId: string, termId: string, id: string): Promise<void> {
  await api.delete(`${base(eventId, termId)}/rooms/${encodeURIComponent(id)}`)
}
/** `rooms` carries a gender for every existing room when switching to gendered rooms. */
export async function setRoomMode(
  eventId: string,
  termId: string,
  roomMode: RoomMode,
  rooms: RoomGender[] = [],
): Promise<void> {
  await api.patch(`${base(eventId, termId)}/room-mode`, { json: { roomMode, rooms } })
}
