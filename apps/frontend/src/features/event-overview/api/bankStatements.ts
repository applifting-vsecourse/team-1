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
})
export type StatementImportResult = z.infer<typeof importResultSchema>

export const UNMATCHED_REASONS = [
  "NO_VARIABLE_SYMBOL",
  "UNKNOWN_VARIABLE_SYMBOL",
  "TERM_NOT_PAYABLE",
  "AMOUNT_NOT_WHOLE",
] as const

const unmatchedSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      /** `YYYY-MM-DD` */
      bookedOn: z.string(),
      /** Hundredths of CZK. */
      amountCents: z.number().int(),
      variableSymbol: z.string().nullable(),
      counterpartyName: z.string().nullable(),
      message: z.string().nullable(),
      reason: z.enum(UNMATCHED_REASONS),
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
