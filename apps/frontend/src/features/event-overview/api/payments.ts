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
  /** Account the organization receives payments to. */
  bankAccount: z.string(),
  amountDueCzk: z.number().int(),
  amountPaidCzk: z.number().int(),
  amountOwedCzk: z.number().int(),
  /** What a summary payment settles now; an overpaid term is not set off against another one. */
  payableCzk: z.number().int(),
  terms: z.array(
    z.object({
      termId: z.string(),
      termNumber: z.number().int(),
      /** Application number × 1000 + term number: pays this term only. */
      variableSymbol: z.string(),
      status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]),
      priceCzk: z.number().int(),
      startsOn: z.string(),
      endsOn: z.string(),
      /** The frozen price while the term is confirmed, otherwise 0. */
      dueCzk: z.number().int(),
      paidCzk: z.number().int(),
      /** Due minus paid; negative = an overpayment of this term. */
      owedCzk: z.number().int(),
      paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
    }),
  ),
  /** Receipts, oldest first: money that arrived at once, split into rows per term. */
  payments: z.array(
    z.object({
      id: z.string(),
      amountCzk: z.number().int(),
      recordedByName: z.string(),
      createdAt: z.string(),
      rows: z.array(z.object({ termId: z.string(), amountCzk: z.number().int() })),
    }),
  ),
})
export type PaymentApplication = z.infer<typeof paymentApplicationSchema>
export type Payment = PaymentApplication["payments"][number]
export type PaymentTerm = PaymentApplication["terms"][number]

const path = (id: string) => `organizer/applications/${encodeURIComponent(id)}/payments`

export const paymentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["eventOverview", "payments", id],
    queryFn: async () => paymentApplicationSchema.parse(await api.get(path(id)).json()),
  })

/** With `termId` the payment is for that term only; without it, a summary payment split over the terms. */
export async function recordPayment(
  id: string,
  requestId: string,
  amountCzk: number | undefined,
  termId?: string,
) {
  await api.post(path(id), {
    json: {
      requestId,
      ...(amountCzk === undefined ? {} : { amountCzk }),
      ...(termId === undefined ? {} : { termId }),
    },
  })
}

export async function cancelPayment(id: string, payment: Payment) {
  await api.delete(`${path(id)}/${encodeURIComponent(payment.id)}`)
}

/** A refund is always taken from one term, so `termId` is required. */
export async function recordRefund(
  id: string,
  requestId: string,
  amountCzk: number,
  termId: string,
) {
  await api.post(`${path(id)}/refunds`, { json: { requestId, amountCzk, termId } })
}
