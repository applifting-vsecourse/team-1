import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const termSchema = z.object({
  termId: z.string(),
  name: z.string(),
  /** ISO date, `2027-07-04`. */
  startsOn: z.string(),
  endsOn: z.string(),
  status: z.enum(["CONFIRMED", "WAITLISTED"]),
  priceCzk: z.number().int(),
})
export type MyApplicationTerm = z.infer<typeof termSchema>

export const myApplicationSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  /** Reference for people: initials of the event and the number, `LKL-0048`. */
  code: z.string(),
  /** The application number as the variable symbol of the payment, `0048`. */
  variableSymbol: z.string(),
  terms: z.array(termSchema),
  amountDueCzk: z.number().int(),
  amountPaidCzk: z.number().int(),
  /** Due − paid; negative is an overpayment. */
  amountOwedCzk: z.number().int(),
  /** `NOTHING_DUE` while no term is confirmed. */
  paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
  /** `null` when every term is waitlisted: nothing to pay yet. */
  paymentDetails: z.object({ bankAccount: z.string(), variableSymbol: z.string() }).nullable(),
})
export type MyApplication = z.infer<typeof myApplicationSchema>
export type PaymentStatus = MyApplication["paymentStatus"]

/** `GET /api/participant/applications` — every application of the signed-in account (US-54). */
export const myApplicationsQueryOptions = () =>
  queryOptions({
    queryKey: ["participant", "applications"],
    queryFn: async (): Promise<MyApplication[]> =>
      z.array(myApplicationSchema).parse(await api.get("participant/applications").json()),
  })

/** `GET /api/participant/applications/:id`. */
export const myApplicationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["participant", "applications", id],
    queryFn: async (): Promise<MyApplication> =>
      myApplicationSchema.parse(
        await api.get(`participant/applications/${encodeURIComponent(id)}`).json(),
      ),
  })
