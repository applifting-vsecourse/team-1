import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const applicationSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string(),
  gender: z.enum(["FEMALE", "MALE"]),
  email: z.string(),
  submittedAt: z.string(),
  amountDueCzk: z.number().int(),
  amountPaidCzk: z.number().int(),
  amountOwedCzk: z.number().int(),
  paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
  terms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      startsOn: z.string(),
      endsOn: z.string(),
      status: z.enum(["CONFIRMED", "WAITLISTED"]),
      priceCzk: z.number().int(),
    }),
  ),
})
export type ListedApplication = z.infer<typeof applicationSchema>
export const applicationsQueryOptions = (eventId: string, filters: ApplicationsSearch) =>
  queryOptions({
    queryKey: ["eventOverview", "applications", eventId, filters],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams()
      if (filters.q) searchParams.set("q", filters.q)
      if (filters.term) searchParams.set("termId", filters.term)
      if (filters.status) searchParams.set("status", filters.status)
      if (filters.gender) searchParams.set("gender", filters.gender)
      if (filters.paid) searchParams.set("paid", filters.paid)
      return z.array(applicationSchema).parse(
        await api
          .get(`organizer/events/${encodeURIComponent(eventId)}/applications`, {
            searchParams,
            signal,
          })
          .json(),
      )
    },
  })
