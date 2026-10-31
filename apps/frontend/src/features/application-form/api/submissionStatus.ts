import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const termSchema = z.object({
  termId: z.string(),
  name: z.string(),
  /** ISO date, `2027-07-04`. */
  startsOn: z.string(),
  endsOn: z.string(),
  /** `WAITLISTED` is shown as waitlisted — never as a place in line. */
  status: z.enum(["CONFIRMED", "WAITLISTED", "CANCELLED"]),
  priceCzk: z.number().int(),
})

const submittedApplicationSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  /** Reference for people, `LKL-0048`. */
  code: z.string(),
  /** The application number, four digits. */
  variableSymbol: z.string(),
  terms: z.array(termSchema),
  /** `NOTHING_DUE` while no term is confirmed. */
  paymentStatus: z.enum(["NOTHING_DUE", "UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]),
  /** Own amount and variable symbol of this application; `null` when every term is waitlisted. */
  payment: z
    .object({
      bankAccount: z.string(),
      variableSymbol: z.string(),
      /** Still to pay, whole CZK. */
      amountCzk: z.number().int(),
    })
    .nullable(),
})

export const submissionStatusSchema = z.object({
  eventName: z.string(),
  email: z.string(),
  /** The account was created by this submission (no password yet). */
  isNewAccount: z.boolean(),
  /** One per participant, in form order. */
  applications: z.array(submittedApplicationSchema),
})
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>
export type SubmittedApplication = SubmissionStatus["applications"][number]

/** `GET /api/public/applications/:accessToken` — the page after sending (US-25). */
export const submissionStatusQueryOptions = (accessToken: string) =>
  queryOptions({
    queryKey: ["application-form", "submission-status", accessToken],
    queryFn: async (): Promise<SubmissionStatus> =>
      submissionStatusSchema.parse(
        await api.get(`public/applications/${encodeURIComponent(accessToken)}`).json(),
      ),
  })
