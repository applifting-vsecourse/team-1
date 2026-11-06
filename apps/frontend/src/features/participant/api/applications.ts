import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const termSchema = z.object({
  termId: z.string(),
  name: z.string().nullable(),
  /** ISO date, `2027-07-04`. */
  startsOn: z.string(),
  endsOn: z.string(),
  status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]),
  priceCzk: z.number().int(),
})
export type MyApplicationTerm = z.infer<typeof termSchema>

/** One confirmed term with its own variable symbol (US-137). */
const termPaymentSchema = z.object({
  termId: z.string(),
  termNumber: z.number().int(),
  /** Application number × 1000 + term number: pays this term only. */
  variableSymbol: z.string(),
  dueCzk: z.number().int(),
  paidCzk: z.number().int(),
  /** Due − paid; negative is an overpayment of this term. */
  owedCzk: z.number().int(),
  paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
})
export type TermPayment = z.infer<typeof termPaymentSchema>

/** Who runs the event; e-mail and phone come from the event's public page and may be missing (D-092). */
const organizationContactSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  /** As the organizer typed it. */
  phone: z.string().nullable(),
})
export type OrganizationContact = z.infer<typeof organizationContactSchema>

export const myApplicationSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  /** Reference for people: initials of the event and the number, `LKL-0048`. */
  code: z.string(),
  /** The summary variable symbol of the application (number × 1000), `48000`. */
  variableSymbol: z.string(),
  terms: z.array(termSchema),
  amountDueCzk: z.number().int(),
  amountPaidCzk: z.number().int(),
  /** Due − paid; negative is an overpayment. */
  amountOwedCzk: z.number().int(),
  /** `NOTHING_DUE` while no term is confirmed. */
  paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
  /** `null` when every term is waitlisted: nothing to pay yet. */
  paymentDetails: z
    .object({
      bankAccount: z.string(),
      summary: z.object({
        /** `…000`: pays everything that is due now. */
        variableSymbol: z.string(),
        /** Sum of the debts of the terms; an overpaid term is not set off against another. */
        payableCzk: z.number().int(),
      }),
      /** Confirmed terms only, earliest first. */
      terms: z.array(termPaymentSchema),
    })
    .nullable(),
  organizationContact: organizationContactSchema,
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

const changeOptionsSchema = z.object({
  canChangeImmediately: z.boolean(),
  terms: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      startsOn: z.string(),
      endsOn: z.string(),
      priceCzk: z.number().int(),
      owedAfterChangeCzk: z.number().int(),
      paidCzk: z.number().int(),
      owedBeforeCancellationCzk: z.number().int(),
      owedAfterCancellationCzk: z.number().int(),
      overpaymentAfterCancellationCzk: z.number().int(),
      selected: z.boolean(),
    }),
  ),
})

export const participantChangeOptionsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["participant", "applications", id, "change-options"],
    queryFn: async () =>
      changeOptionsSchema.parse(
        await api.get(`participant/applications/${encodeURIComponent(id)}/change-options`).json(),
      ),
  })

const termChangeResultSchema = z.object({
  addedTerms: z.array(z.object({ termId: z.string(), owedCzk: z.number().int() })),
})

export async function changeParticipantTerms(id: string, termIds: string[]) {
  return termChangeResultSchema.parse(
    await api
      .put(`participant/applications/${encodeURIComponent(id)}/terms`, {
        json: { termIds },
      })
      .json(),
  )
}
