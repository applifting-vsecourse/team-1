import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const roomModeSchema = z.enum(["GENDERED", "SHARED"])
const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().int().min(1),
  /** Extra beds (přistýlky) of the room in this term; each is one more bed. */
  extraBeds: z.number().int().min(0),
  /** Capacity plus extra beds, computed by the API. */
  beds: z.number().int().min(1),
  gender: z.enum(["FEMALE", "MALE"]).nullable(),
})
const termRoomsSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  organizationName: z.string(),
  termId: z.string(),
  termName: z.string().nullable(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
  roomMode: roomModeSchema,
  /** Confirmed participants see their room (US-144). */
  roomsPublished: z.boolean(),
  rooms: z.array(roomSchema),
  capacity: z.object({ FEMALE: z.number().int(), MALE: z.number().int(), total: z.number().int() }),
})
export type Room = z.infer<typeof roomSchema>
export type RoomMode = z.infer<typeof roomModeSchema>
export type TermRooms = z.infer<typeof termRoomsSchema>
export type RoomInput = Omit<Room, "id" | "extraBeds" | "beds">
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
/** Sets the extra beds of one room of the term; only this term changes. */
export async function setExtraBeds(
  eventId: string,
  termId: string,
  roomId: string,
  extraBeds: number,
): Promise<void> {
  await api.patch(`${base(eventId, termId)}/rooms/${encodeURIComponent(roomId)}/extra-beds`, {
    json: { extraBeds },
  })
}
export async function deleteRoom(eventId: string, termId: string, id: string): Promise<void> {
  await api.delete(`${base(eventId, termId)}/rooms/${encodeURIComponent(id)}`)
}
/** Publishes the room assignment of the term to the confirmed participants, or takes it back (US-144). */
export async function setRoomsPublished(
  eventId: string,
  termId: string,
  isPublished: boolean,
): Promise<void> {
  await api.patch(`${base(eventId, termId)}/rooms-published`, {
    json: { published: isPublished },
  })
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
/** What a copy does with the rooms the target term already has. */
export type RoomCopyStrategy = "ADD" | "REPLACE"
/** One-off copy of the rooms of another term of the event; the copies are independent. */
export async function copyRooms(
  eventId: string,
  termId: string,
  sourceTermId: string,
  strategy: RoomCopyStrategy,
): Promise<void> {
  await api.post(`${base(eventId, termId)}/rooms/copy`, { json: { sourceTermId, strategy } })
}
/** One bulk create: `count` shared rooms, or `countFemale` + `countMale` in a gendered term; at most 200 in sum. */
export type BulkRoomsInput = {
  capacity: number
  firstNumber: number
  count?: number
  countFemale?: number
  countMale?: number
}
const bulkRoomsResultSchema = z.object({
  created: z.array(z.string()),
  skipped: z.array(z.string()),
})
/** Names created, and names skipped because the term already has a room with that name. */
export type BulkRoomsResult = z.infer<typeof bulkRoomsResultSchema>
/** Creates the rooms of one request; rooms whose name already exists are skipped, not refused. */
export async function createRoomsBulk(
  eventId: string,
  termId: string,
  input: BulkRoomsInput,
): Promise<BulkRoomsResult> {
  return bulkRoomsResultSchema.parse(
    await api.post(`${base(eventId, termId)}/rooms/bulk`, { json: input }).json(),
  )
}
