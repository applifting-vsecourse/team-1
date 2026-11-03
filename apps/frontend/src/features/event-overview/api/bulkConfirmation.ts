import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const namedSchema = z.object({ applicationId: z.string(), name: z.string() })
const previewSchema = z.object({
  selectedCount: z.number().int(),
  freePlaces: z.object({ FEMALE: z.number().int(), MALE: z.number().int() }),
  isShared: z.boolean(),
  /** In order of receipt. */
  confirmable: z.array(namedSchema),
  skipped: z.array(namedSchema),
})
export type BulkConfirmationPreview = z.infer<typeof previewSchema>

const resultSchema = z.object({
  confirmed: z.array(z.string()),
  unchanged: z.array(z.string()),
})
export type BulkConfirmationResult = z.infer<typeof resultSchema>

const path = (eventId: string, termId: string) =>
  `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/bulk-confirmation`

export const bulkConfirmationPreviewQueryOptions = (
  eventId: string,
  termId: string,
  applicationIds: string[],
) =>
  queryOptions({
    queryKey: ["eventOverview", "bulkConfirmationPreview", eventId, termId, applicationIds],
    // A preview is a snapshot of the free beds: never reuse an old one.
    gcTime: 0,
    queryFn: async ({ signal }) =>
      previewSchema.parse(
        await api
          .post(`${path(eventId, termId)}/preview`, { json: { applicationIds }, signal })
          .json(),
      ),
  })

export async function confirmSelected(
  eventId: string,
  termId: string,
  applicationIds: string[],
): Promise<BulkConfirmationResult> {
  return resultSchema.parse(
    await api.post(path(eventId, termId), { json: { applicationIds } }).json(),
  )
}
