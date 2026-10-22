import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const paymentApplicationSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  code: z.string(),
  amountDueCzk: z.number().int(),
  amountPaidCzk: z.number().int(),
  amountOwedCzk: z.number().int(),
  terms: z.array(
    z.object({
      status: z.enum(["CONFIRMED", "WAITLISTED"]),
      priceCzk: z.number().int(),
      startsOn: z.string(),
      endsOn: z.string(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string(),
      amountCzk: z.number().int(),
      recordedByName: z.string(),
      createdAt: z.string(),
    }),
  ),
})
export type PaymentApplication = z.infer<typeof paymentApplicationSchema>
export type Payment = PaymentApplication["payments"][number]

const path = (id: string) => `organizer/applications/${encodeURIComponent(id)}/payments`

export const paymentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["eventOverview", "payments", id],
    queryFn: async () => paymentApplicationSchema.parse(await api.get(path(id)).json()),
  })

export async function recordPayment(id: string, requestId: string, amountCzk: number | undefined) {
  await api.post(path(id), {
    json: { requestId, ...(amountCzk === undefined ? {} : { amountCzk }) },
  })
}

export async function cancelPayment(id: string, payment: Payment) {
  await api.delete(`${path(id)}/${encodeURIComponent(payment.id)}`)
}
