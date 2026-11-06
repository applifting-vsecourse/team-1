import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const paymentOverviewSchema = z.object({
  totalDebtCzk: z.number().int(),
  debtorCount: z.number().int(),
  overdueCount: z.number().int(),
  entries: z.array(
    z.object({
      applicationId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      termId: z.string(),
      termName: z.string().nullable(),
      paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
      amountDueCzk: z.number().int(),
      amountPaidCzk: z.number().int(),
      amountOwedCzk: z.number().int(),
      paymentDueAt: z.string(),
      overdue: z.boolean(),
      reminderCount: z.number().int(),
      lastReminderAt: z.string().nullable(),
    }),
  ),
})

export type PaymentOverviewEntry = z.infer<typeof paymentOverviewSchema>["entries"][number]

export const paymentOverviewQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "payments", eventId],
    queryFn: async ({ signal }) =>
      paymentOverviewSchema.parse(
        await api
          .get(`organizer/events/${encodeURIComponent(eventId)}/payments`, { signal })
          .json(),
      ),
  })
