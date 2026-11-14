import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const genderSchema = z.enum(["FEMALE", "MALE"])
const participantSchema = z.object({
  /** Application in the term — the id the assignment endpoints take. */
  applicationTermId: z.string(),
  applicationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: genderSchema,
  status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]),
})
const otherTermSchema = z.object({
  termId: z.string(),
  name: z.string().nullable(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
  rooms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      gender: genderSchema.nullable(),
      freeBeds: z.number().int(),
    }),
  ),
})
const unassignedSchema = participantSchema.extend({
  /** Other terms of the same application where the room of the same name can get them too. */
  alsoInTerms: z.array(otherTermSchema),
})
const assignmentRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().int(),
  extraBeds: z.number().int().min(0),
  /** Capacity plus extra beds, computed by the API. */
  beds: z.number().int(),
  gender: genderSchema.nullable(),
  participants: z.array(participantSchema),
})
const roomAssignmentsSchema = z.object({
  eventId: z.string(),
  termId: z.string(),
  rooms: z.array(assignmentRoomSchema),
  unassigned: z.array(unassignedSchema),
})

export type AssignmentParticipant = z.infer<typeof participantSchema>
export type UnassignedParticipant = z.infer<typeof unassignedSchema>
export type AssignmentOtherTerm = z.infer<typeof otherTermSchema>
export type AssignmentRoom = z.infer<typeof assignmentRoomSchema>
export type RoomAssignments = z.infer<typeof roomAssignmentsSchema>

const base = (eventId: string, termId: string) =>
  `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/room-assignments`

export const roomAssignmentsKey = (eventId: string, termId: string) =>
  ["events", eventId, "room-assignments", termId] as const

export const roomAssignmentsQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: roomAssignmentsKey(eventId, termId),
    queryFn: async () => roomAssignmentsSchema.parse(await api.get(base(eventId, termId)).json()),
  })

/**
 * Puts the participant into a room of the term, or moves them. `alsoTermIds` names other terms of
 * the same application where the room of the same name gets them too — all or nothing.
 */
export async function assignRoom(
  eventId: string,
  termId: string,
  applicationTermId: string,
  roomId: string,
  alsoTermIds: string[] = [],
): Promise<void> {
  await api.put(`${base(eventId, termId)}/${encodeURIComponent(applicationTermId)}`, {
    json: { roomId, alsoTermIds },
  })
}

/** Takes the participant out of their room; they are unassigned again. */
export async function unassignRoom(
  eventId: string,
  termId: string,
  applicationTermId: string,
): Promise<void> {
  await api.delete(`${base(eventId, termId)}/${encodeURIComponent(applicationTermId)}`)
}
