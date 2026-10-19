import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const publicTermSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** ISO date, `2027-07-04`. */
  startsOn: z.string(),
  endsOn: z.string(),
  priceCzk: z.number().int(),
})
export type PublicTerm = z.infer<typeof publicTermSchema>

export const publicEventSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  terms: z.array(publicTermSchema),
})
export type PublicEvent = z.infer<typeof publicEventSchema>

/** The event behind an application link: `GET /api/public/events/:publicToken`. */
export const publicEventQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ["public-event", token],
    queryFn: async (): Promise<PublicEvent> =>
      publicEventSchema.parse(await api.get(`public/events/${encodeURIComponent(token)}`).json()),
  })
