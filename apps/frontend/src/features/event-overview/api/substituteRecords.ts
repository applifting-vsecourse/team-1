import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const personSchema = z.object({ applicationId: z.string(), name: z.string() })

/** System record of one confirmation from the waitlist (US-105). Read-only. */
export const substituteRecordSchema = z.object({
  id: z.string(),
  termId: z.string(),
  /** Queue of the confirmed one: their gender, or the one common queue. */
  group: z.enum(["FEMALE", "MALE", "SHARED"]),
  confirmed: personSchema,
  /** Waiting ahead of the confirmed one in the same queue, in order. */
  skipped: z.array(personSchema),
  /** Null: the system acted. */
  changedByName: z.string().nullable(),
  changedAt: z.string(),
})
export type SubstituteRecord = z.infer<typeof substituteRecordSchema>

export const substituteHistoryQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "substituteHistory", eventId, termId],
    queryFn: async () =>
      z
        .array(substituteRecordSchema)
        .parse(
          await api
            .get(
              `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/substitutes/history`,
            )
            .json(),
        ),
  })
