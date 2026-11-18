import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const previewSchema = z.object({
  terms: z.array(
    z.object({
      termId: z.string(),
      status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"]),
      isWithdrawn: z.boolean(),
      /** False for a waitlisted or not yet evaluated term: nothing is owed there. */
      hasFinancialImpact: z.boolean(),
      paidCzk: z.number().int(),
      /** Debt of the term after the withdrawal: a withdrawn term owes nothing. */
      debtCzk: z.number().int(),
      overpaymentCzk: z.number().int(),
    }),
  ),
  overpaymentCzk: z.number().int(),
})
export type WithdrawalPreview = z.infer<typeof previewSchema>

const resultSchema = z.object({
  changedAt: z.string(),
  changedByName: z.string().nullable(),
})
export type WithdrawalResult = z.infer<typeof resultSchema>

const path = (applicationId: string) =>
  `organizer/applications/${encodeURIComponent(applicationId)}/terms`

export const withdrawalPreviewQueryOptions = (applicationId: string, termIds: string[]) =>
  queryOptions({
    queryKey: ["eventOverview", "withdrawalPreview", applicationId, termIds],
    queryFn: async () =>
      previewSchema.parse(
        await api
          .get(`${path(applicationId)}/withdraw-preview`, {
            searchParams: { termIds: termIds.join(",") },
          })
          .json(),
      ),
  })

export async function withdrawTerms(
  applicationId: string,
  termIds: string[],
): Promise<WithdrawalResult> {
  return resultSchema.parse(
    await api.post(`${path(applicationId)}/withdraw`, { json: { termIds } }).json(),
  )
}
