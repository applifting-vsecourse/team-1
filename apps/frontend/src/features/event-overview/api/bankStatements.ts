import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const importResultSchema = z.object({
  matchedCount: z.number().int(),
  matchedCzk: z.number().int(),
  unmatchedCount: z.number().int(),
  unmatchedCzk: z.number(),
  overpaidCount: z.number().int(),
  overpaidCzk: z.number().int(),
  duplicateCount: z.number().int(),
  ignoredCount: z.number().int(),
  /** The uploaded CSV with the result of each row, in the request language (US-561). */
  annotatedCsv: z.string(),
})
export type StatementImportResult = z.infer<typeof importResultSchema>

export const UNMATCHED_REASONS = [
  "NO_VARIABLE_SYMBOL",
  "UNKNOWN_VARIABLE_SYMBOL",
  "UNSUPPORTED_CURRENCY",
  "AMOUNT_NOT_WHOLE",
] as const

const unmatchedSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      /** `YYYY-MM-DD` */
      bookedOn: z.string(),
      /** Hundredths of the currency. */
      amountCents: z.number().int(),
      currency: z.string(),
      variableSymbol: z.string().nullable(),
      counterpartyName: z.string().nullable(),
      message: z.string().nullable(),
      reason: z.enum(UNMATCHED_REASONS),
      previousReceiptId: z.string().nullish(),
      applicationId: z.string().nullable(),
      applicantName: z.string().nullable(),
    }),
  ),
})
export type UnmatchedTransaction = z.infer<typeof unmatchedSchema>["transactions"][number]

const path = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}`

export const unmatchedTransactionsKey = (eventId: string) =>
  ["eventOverview", "unmatchedTransactions", eventId] as const

export const unmatchedTransactionsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: unmatchedTransactionsKey(eventId),
    queryFn: async ({ signal }) =>
      unmatchedSchema.parse(
        await api.get(`${path(eventId)}/bank-transactions/unmatched`, { signal }).json(),
      ),
  })

/** `POST /api/organizer/events/:eventId/bank-statements` — the CSV text itself is the body. */
export async function uploadBankStatement(
  eventId: string,
  file: File,
): Promise<StatementImportResult> {
  return importResultSchema.parse(
    await api
      .post(`${path(eventId)}/bank-statements`, {
        body: await file.text(),
        headers: { "Content-Type": "text/csv" },
      })
      .json(),
  )
}

const candidatesSchema = z.object({
  /** The amount the backend computed `afterPayment` from. */
  previewAmountCents: z.number().int().nullable(),
  candidates: z.array(
    z.object({
      id: z.string(),
      number: z.number().int(),
      firstName: z.string(),
      lastName: z.string(),
      terms: z.array(
        z.object({
          termId: z.string(),
          termNumber: z.number().int(),
          name: z.string().nullable(),
          startsOn: z.string(),
          endsOn: z.string(),
          status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"]),
          /** Due minus paid; negative = an overpayment. */
          owedCzk: z.number().int(),
          paidCzk: z.number().int(),
          /** What the payment of the requested transaction does to the term, computed by the backend. */
          afterPayment: z
            .object({
              fromCzk: z.number().int(),
              toCzk: z.number().int(),
              restCzk: z.number().int(),
              overCzk: z.number().int(),
            })
            .nullable(),
        }),
      ),
    }),
  ),
})
export type ApplicationCandidate = z.infer<typeof candidatesSchema>["candidates"][number]
export type CandidateTerm = ApplicationCandidate["terms"][number]

/** `GET …/bank-transactions/application-candidates?q=` — at most ten applications of the event. */
export const applicationCandidatesQueryOptions = (
  eventId: string,
  query: string,
  { id: transactionId, amountCents }: UnmatchedTransaction,
) =>
  queryOptions({
    // The preview depends on the amount, which a re-import can change.
    queryKey: [
      "eventOverview",
      "applicationCandidates",
      eventId,
      transactionId,
      amountCents,
      query,
    ] as const,
    queryFn: async ({ signal }) =>
      candidatesSchema.parse(
        await api
          .get(`${path(eventId)}/bank-transactions/application-candidates`, {
            signal,
            searchParams: { q: query, transactionId },
          })
          .json(),
      ),
  })

/** `POST …/bank-transactions/:id/match` — the payment of the transaction goes to one term. */
export async function matchTransaction(
  eventId: string,
  { id, amountCents, previousReceiptId }: UnmatchedTransaction,
  applicationId: string,
  termId: string,
): Promise<void> {
  await api.post(`${path(eventId)}/bank-transactions/${encodeURIComponent(id)}/match`, {
    json: {
      applicationId,
      termId,
      amountCents,
      ...(previousReceiptId ? { previousReceiptId } : {}),
    },
  })
}
