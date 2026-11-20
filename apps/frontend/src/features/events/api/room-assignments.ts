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
  /** Year only (US-36); the overview tells namesakes apart with it. */
  birthYear: z.number().int(),
  gender: genderSchema,
  /** Asked to settle the accommodation individually (US-38). */
  individualAccommodation: z.boolean(),
  status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]),
  /** Roommate wishes (US-146): free text; fulfilled when the named person is in the same room. */
  wishes: z.array(z.object({ name: z.string(), fulfilled: z.boolean() })),
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
      individual: z.boolean().optional(),
      /** Capacity plus extra beds. */
      beds: z.number().int(),
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
  /** Individual (mixed, family) room (US-145). */
  individual: z.boolean().optional(),
  participants: z.array(participantSchema),
})
const warningKindSchema = z.enum(["OVERCROWDED", "MIXED_GENDER", "CONFIRMED_WITHOUT_BED"])
const roomWarningSchema = z.object({
  kind: warningKindSchema,
  /** Set for the two room kinds. */
  roomId: z.string().nullable(),
  /** Set for CONFIRMED_WITHOUT_BED. */
  applicationTermId: z.string().nullable(),
  /** Knowingly confirmed by an organizer: shown muted, not counted. */
  acknowledged: z.boolean(),
  note: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  acknowledgedBy: z.string().nullable(),
})
const roomWarningsSummarySchema = z.object({
  violations: z.number().int(),
  acknowledged: z.number().int(),
  confirmedWithoutBed: z.number().int(),
})
const roomAssignmentsSchema = z.object({
  eventId: z.string(),
  termId: z.string(),
  rooms: z.array(assignmentRoomSchema),
  unassigned: z.array(unassignedSchema),
  warnings: z.array(roomWarningSchema),
  summary: roomWarningsSummarySchema,
})

export type RoomWarning = z.infer<typeof roomWarningSchema>
export type RoomWarningKind = z.infer<typeof warningKindSchema>

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
  isExtraBedConfirmed = false,
): Promise<void> {
  await api.put(`${base(eventId, termId)}/${encodeURIComponent(applicationTermId)}`, {
    json: { roomId, alsoTermIds, ...(isExtraBedConfirmed ? { confirmExtraBed: true } : {}) },
  })
}

/** Knowingly confirms a warning with a note only organizers of the event see (US-37). */
export async function acknowledgeRoomWarning(
  eventId: string,
  termId: string,
  warning: Pick<RoomWarning, "kind" | "roomId" | "applicationTermId">,
  note: string,
): Promise<void> {
  await api.post(
    `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/room-warnings/acknowledgements`,
    {
      json: {
        kind: warning.kind,
        ...(warning.roomId ? { roomId: warning.roomId } : {}),
        ...(warning.applicationTermId ? { applicationTermId: warning.applicationTermId } : {}),
        note,
      },
    },
  )
}

/** Takes the participant out of their room; they are unassigned again. */
export async function unassignRoom(
  eventId: string,
  termId: string,
  applicationTermId: string,
): Promise<void> {
  await api.delete(`${base(eventId, termId)}/${encodeURIComponent(applicationTermId)}`)
}

const proposalSchema = z.object({
  /** Proposed rooms for confirmed participants without one; nothing is saved by the API. */
  placements: z.array(z.object({ applicationTermId: z.string(), roomId: z.string() })),
  /** Confirmed participants without a room who got none (US-147). */
  unplaced: z.array(
    z.object({
      applicationTermId: z.string(),
      reason: z.enum(["INDIVIDUAL_ACCOMMODATION", "NO_FREE_BED"]),
    }),
  ),
  /** Wishes of the people given a bed; `matches` are the people the name stands for. */
  wishes: z.array(
    z.object({
      applicationTermId: z.string(),
      name: z.string(),
      matches: z.array(z.string()),
      fulfilled: z.boolean(),
    }),
  ),
})

export type RoomProposal = z.infer<typeof proposalSchema>
export type RoomProposalWish = RoomProposal["wishes"][number]

/** Asks for a proposal of rooms for the unassigned confirmed participants; saves nothing (US-147). */
export async function proposeRooms(eventId: string, termId: string): Promise<RoomProposal> {
  return proposalSchema.parse(await api.post(`${base(eventId, termId)}/proposal`).json())
}

/** Saves a confirmed proposal: every assignment in one transaction, or none (US-147). */
export async function saveRoomProposal(
  eventId: string,
  termId: string,
  placements: { applicationTermId: string; roomId: string }[],
): Promise<void> {
  await api.post(`${base(eventId, termId)}/bulk`, { json: { assignments: placements } })
}
