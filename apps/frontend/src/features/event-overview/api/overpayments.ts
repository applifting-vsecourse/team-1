import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const overpaymentSchema = z.object({
  applicationId: z.string(),
  applicationNumber: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  termId: z.string(),
  termName: z.string().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  status: z.enum(["CONFIRMED", "WAITLISTED", "TO_EVALUATE", "CANCELLED", "ARCHIVED"]),
  variableSymbol: z.string(),
  amountCzk: z.number().int().positive(),
})

export type Overpayment = z.infer<typeof overpaymentSchema>

export const overpaymentsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "payments", eventId, "overpayments"],
    queryFn: async ({ signal }) =>
      overpaymentSchema
        .array()
        .parse(
          await api
            .get(`organizer/events/${encodeURIComponent(eventId)}/payments/overpayments`, {
              signal,
            })
            .json(),
        ),
  })
