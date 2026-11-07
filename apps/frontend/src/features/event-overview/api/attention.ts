import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const attentionSchema = z.object({
  toEvaluateCount: z.number().int(),
  debt: z.object({
    debtorCount: z.number().int(),
    overdueCount: z.number().int(),
    totalDebtCzk: z.number().int(),
  }),
  changeRequestCount: z.number().int(),
})
export type Attention = z.infer<typeof attentionSchema>

/** `GET /api/organizer/events/:eventId/attention` — counts of the overview cards (US-51). */
export const attentionQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "attention", eventId],
    queryFn: async ({ signal }) =>
      attentionSchema.parse(
        await api
          .get(`organizer/events/${encodeURIComponent(eventId)}/attention`, { signal })
          .json(),
      ),
  })
