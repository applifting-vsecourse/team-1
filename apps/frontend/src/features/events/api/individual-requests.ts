import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const individualRequestsSchema = z.object({
  requests: z.array(
    z.object({
      applicationTermId: z.string(),
      applicationId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED"]),
      /** What the applicant wrote; null when they only asked for individual accommodation. */
      request: z.string().nullable(),
    }),
  ),
})
export type IndividualRequest = z.infer<typeof individualRequestsSchema>["requests"][number]

export const individualRequestsKey = (eventId: string, termId: string) =>
  ["events", eventId, "individual-requests", termId] as const

export const individualRequestsQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: individualRequestsKey(eventId, termId),
    queryFn: async () =>
      individualRequestsSchema.parse(
        await api
          .get(
            `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/individual-requests`,
          )
          .json(),
      ),
  })
