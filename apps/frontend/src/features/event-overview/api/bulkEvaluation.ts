import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import type { BulkDecision } from "@/features/event-overview/api/bulkDecision"

const genderCountsSchema = z.object({ FEMALE: z.number().int(), MALE: z.number().int() })
const breakdownSchema = z.object({ total: z.number().int(), byGender: genderCountsSchema })
const previewSchema = z.object({
  /** Selected applications still waiting for evaluation. */
  selected: breakdownSchema,
  confirm: breakdownSchema,
  /** Do not fit: the organizer chooses what happens to them. */
  rest: breakdownSchema,
  freePlaces: genderCountsSchema,
  isShared: z.boolean(),
})
export type BulkEvaluationPreview = z.infer<typeof previewSchema>

const resultSchema = z.object({
  confirmed: z.array(z.string()),
  waitlisted: z.array(z.string()),
  rejected: z.array(z.string()),
  unchanged: z.array(z.string()),
})
export type BulkEvaluationResult = z.infer<typeof resultSchema>

/** The error code of an evaluation whose preview is out of date: nothing was changed. */
export const EVALUATION_PLAN_CHANGED = "EVALUATION_PLAN_CHANGED"

const path = (eventId: string, termId: string) =>
  `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/bulk-evaluation`

export const bulkEvaluationPreviewQueryOptions = (
  eventId: string,
  termId: string,
  applicationIds: string[],
) =>
  queryOptions({
    queryKey: ["eventOverview", "bulkEvaluationPreview", eventId, termId, applicationIds],
    // A preview is a snapshot of the free beds: never reuse an old one.
    gcTime: 0,
    queryFn: async ({ signal }) =>
      previewSchema.parse(
        await api
          .post(`${path(eventId, termId)}/preview`, { json: { applicationIds }, signal })
          .json(),
      ),
  })

export async function evaluateSelected(
  eventId: string,
  termId: string,
  applicationIds: string[],
  expectedConfirmed: BulkEvaluationPreview["confirm"]["byGender"],
  rest: BulkDecision | undefined,
): Promise<BulkEvaluationResult> {
  return resultSchema.parse(
    await api
      .post(path(eventId, termId), { json: { applicationIds, expectedConfirmed, rest } })
      .json(),
  )
}
