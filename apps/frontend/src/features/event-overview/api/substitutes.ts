import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const substituteSchema = z.object({
  applicationId: z.string(),
  number: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string(),
  gender: z.enum(["FEMALE", "MALE"]),
  email: z.string(),
  submittedAt: z.string(),
  /** Position in the waitlist of the bed group. */
  position: z.number().int(),
  priceCzk: z.number().int(),
  /** The first of its bed group: the one the freed bed is proposed to (US-31). */
  isProposed: z.boolean(),
})
export type Substitute = z.infer<typeof substituteSchema>

const listSchema = z.object({
  termId: z.string(),
  evaluationMode: z.enum(["AUTOMATIC", "MANUAL"]),
  roomMode: z.enum(["GENDERED", "SHARED"]),
  /** In shared rooms both numbers are the one common pool. */
  freeBeds: z.object({ FEMALE: z.number().int(), MALE: z.number().int() }),
  /** In order of receipt. */
  items: z.array(substituteSchema),
})
export type SubstituteList = z.infer<typeof listSchema>

const path = (eventId: string, termId: string) =>
  `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/substitutes`

export const substitutesQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "substitutes", eventId, termId],
    queryFn: async () => listSchema.parse(await api.get(path(eventId, termId)).json()),
  })

export async function confirmSubstitute(
  eventId: string,
  termId: string,
  applicationId: string,
): Promise<void> {
  await api.post(`${path(eventId, termId)}/${encodeURIComponent(applicationId)}/confirm`)
}

const proposalSchema = z.object({
  termId: z.string(),
  termName: z.string().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  /** Bed group: a gender in gendered rooms, or the one common pool. */
  group: z.enum(["FEMALE", "MALE", "SHARED"]),
  freeBeds: z.number().int(),
  substitute: z.object({
    applicationId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    gender: z.enum(["FEMALE", "MALE"]),
    priceCzk: z.number().int(),
  }),
})
export type SubstituteProposal = z.infer<typeof proposalSchema>

/**
 * `GET /api/organizer/events/:eventId/substitute-proposals` — the free beds of the event's terms
 * with the first substitute each is proposed to: the organizer's notice (US-31).
 */
export const substituteProposalsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "substituteProposals", eventId],
    queryFn: async () =>
      z
        .array(proposalSchema)
        .parse(
          await api
            .get(`organizer/events/${encodeURIComponent(eventId)}/substitute-proposals`)
            .json(),
        ),
  })
