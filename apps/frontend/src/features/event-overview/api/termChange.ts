import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const optionSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  /** The application is in the term now. */
  selected: z.boolean(),
})
export type TermChangeOption = z.infer<typeof optionSchema>

const previewSchema = z.object({
  gender: z.enum(["FEMALE", "MALE"]),
  newPriceCzk: z.number().int(),
  /** Debt over the terms the application will be in; payments are not moved between terms. */
  amountToPayCzk: z.number().int(),
  overpaymentCzk: z.number().int(),
  added: z.array(
    z.object({
      termId: z.string(),
      priceCzk: z.number().int(),
      /** Already paid in the term; a reactivated term keeps its payments. */
      paidCzk: z.number().int(),
      /** Debt left in the term; computed by the backend. */
      toPayCzk: z.number().int(),
      /** A bed of the applicant's gender is free in the new term. */
      fits: z.boolean(),
      /** Beds the applicant's gender can use in the term, and how many are free. */
      genderCapacity: z.number().int(),
      genderFree: z.number().int(),
    }),
  ),
  removed: z.array(
    z.object({
      termId: z.string(),
      paidCzk: z.number().int(),
      overpaymentCzk: z.number().int(),
    }),
  ),
})
export type TermChangePreview = z.infer<typeof previewSchema>

const resultSchema = z.object({
  changed: z.boolean(),
  changedAt: z.string(),
  changedByName: z.string().nullable(),
})
export type TermChangeResult = z.infer<typeof resultSchema>

const path = (applicationId: string) =>
  `organizer/applications/${encodeURIComponent(applicationId)}/terms`

export const termChangeOptionsQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "termChangeOptions", applicationId],
    queryFn: async () =>
      z.array(optionSchema).parse(await api.get(`${path(applicationId)}/change-options`).json()),
  })

export const termChangePreviewQueryOptions = (applicationId: string, termIds: string[]) =>
  queryOptions({
    queryKey: ["eventOverview", "termChangePreview", applicationId, termIds],
    queryFn: async () =>
      previewSchema.parse(
        await api
          .get(`${path(applicationId)}/change-preview`, {
            searchParams: { termIds: termIds.join(",") },
          })
          .json(),
      ),
  })

export async function changeTerms(
  applicationId: string,
  termIds: string[],
  isOverCapacityConfirmed: boolean,
): Promise<TermChangeResult> {
  return resultSchema.parse(
    await api
      .put(path(applicationId), {
        json: { termIds, ...(isOverCapacityConfirmed ? { confirmOverCapacity: true } : {}) },
      })
      .json(),
  )
}
