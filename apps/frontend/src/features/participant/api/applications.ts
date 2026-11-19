import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const termSchema = z.object({
  termId: z.string(),
  name: z.string().nullable(),
  /** ISO date, `2027-07-04`. */
  startsOn: z.string(),
  endsOn: z.string(),
  status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"]),
  priceCzk: z.number().int(),
  archivedOverpaymentCzk: z.number().int().nonnegative().optional(),
  /** The organizer offers transport to this term (US-65). */
  transportOffered: z.boolean(),
  /** The participant chose a transport or their own transport for this term. */
  transportDecided: z.boolean(),
  /**
   * Only for a confirmed term whose room assignment is published; `name` is `null` while the
   * participant has no room yet (US-144).
   */
  room: z.object({ name: z.string().nullable() }).optional(),
  /**
   * Names the participant wishes to room with; only for a confirmed term (US-146). Absent for any
   * other term, so there is nothing to show or write.
   */
  roomWishes: z.array(z.string()).optional(),
  /**
   * Later arrival and earlier departure, Prague wall time `yyyy-MM-ddTHH:mm` or `null` (US-143).
   * Absent for a cancelled or archived term, so there is nothing to show or write.
   */
  stay: z
    .object({ lateArrival: z.string().nullable(), earlyDeparture: z.string().nullable() })
    .optional(),
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
  /** When the debt falls due (ISO datetime); `null` when nothing is owed. */
  paymentDeadline: z.string().nullable(),
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
  eventId: z.string().optional(),
  applicantEmail: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["FEMALE", "MALE"]).optional(),
  firstName: z.string(),
  lastName: z.string(),
  /** Reference for people: initials of the event and the number, `LKL-0048`. */
  code: z.string(),
  /** The summary variable symbol of the application (number × 1000), `48000`. */
  variableSymbol: z.string(),
  terms: z.array(termSchema),
  /** Meal restrictions entered; application-wide. */
  mealsDecided: z.boolean(),
  /** Health restriction entered; application-wide. */
  healthDecided: z.boolean(),
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
  /** `true` only on staging and demo (US-115). */
  canSimulatePayment: z.boolean(),
  /** Payments the participant simulated, newest first. */
  simulatedPayments: z.array(
    z.object({ termId: z.string(), amountCzk: z.number().int(), createdAt: z.string() }),
  ),
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

/** `POST /api/participant/applications/:id/payments/simulation` — staging and demo only (US-115). */
export async function simulatePayment(id: string, termId: string) {
  await api.post(`participant/applications/${encodeURIComponent(id)}/payments/simulation`, {
    json: { termId },
  })
}

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

/** `PUT …/terms/:termId/room-wishes` — writes the wishes of a confirmed term; no names delete them (US-146). */
export async function saveRoomWishes(
  applicationId: string,
  termId: string,
  names: string[],
): Promise<void> {
  await api.put(`participant/applications/${applicationId}/terms/${termId}/room-wishes`, {
    json: { names },
  })
}

export type Stay = NonNullable<MyApplicationTerm["stay"]>

/** `PUT …/terms/:termId/stay` — sets, changes or (both `null`) deletes arrival and departure (US-143). */
export async function saveStay(applicationId: string, termId: string, stay: Stay): Promise<void> {
  await api.put(`participant/applications/${applicationId}/terms/${termId}/stay`, { json: stay })
}
