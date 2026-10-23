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
const eventRoomsSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  organizationName: z.string(),
  roomMode: roomModeSchema,
  termCount: z.number().int(),
  rooms: z.array(roomSchema),
  capacity: z.object({ FEMALE: z.number().int(), MALE: z.number().int(), total: z.number().int() }),
})
export type Room = z.infer<typeof roomSchema>
export type RoomMode = z.infer<typeof roomModeSchema>
export type EventRooms = z.infer<typeof eventRoomsSchema>
export type RoomInput = Omit<Room, "id">
const base = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}`

export const roomsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["events", eventId, "rooms"],
    queryFn: async () => eventRoomsSchema.parse(await api.get(`${base(eventId)}/rooms`).json()),
  })

export async function saveRoom(eventId: string, input: RoomInput, id?: string): Promise<void> {
  const path = `${base(eventId)}/rooms${id ? `/${encodeURIComponent(id)}` : ""}`
  if (id) await api.put(path, { json: input })
  else await api.post(path, { json: input })
}
export async function deleteRoom(eventId: string, id: string): Promise<void> {
  await api.delete(`${base(eventId)}/rooms/${encodeURIComponent(id)}`)
}
export async function setRoomMode(eventId: string, roomMode: RoomMode): Promise<void> {
  await api.patch(`${base(eventId)}/room-mode`, { json: { roomMode } })
}
