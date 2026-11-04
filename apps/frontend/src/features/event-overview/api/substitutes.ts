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

const confirmationSchema = z.object({
  applicationId: z.string(),
  priceCzk: z.number().int(),
  bankAccount: z.string(),
  variableSymbol: z.string(),
})
export type SubstituteConfirmation = z.infer<typeof confirmationSchema>

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
): Promise<SubstituteConfirmation> {
  return confirmationSchema.parse(
    await api.post(`${path(eventId, termId)}/${encodeURIComponent(applicationId)}/confirm`).json(),
  )
}
