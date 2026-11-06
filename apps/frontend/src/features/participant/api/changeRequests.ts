import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const changeRequestSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  eventId: z.string(),
  participantName: z.string(),
  participantGender: z.enum(["FEMALE", "MALE"]),
  currentTermIds: z.array(z.string()),
  requestedTermIds: z.array(z.string()),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  terms: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      startsOn: z.string(),
      endsOn: z.string(),
      priceCzk: z.number().int(),
    }),
  ),
})
export type ChangeRequest = z.infer<typeof changeRequestSchema>

export const participantChangeRequestsQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["participant", "applications", applicationId, "change-requests"],
    queryFn: async () =>
      z
        .array(changeRequestSchema)
        .parse(
          await api
            .get(`participant/applications/${encodeURIComponent(applicationId)}/change-requests`)
            .json(),
        ),
  })

export async function submitChangeRequest(applicationId: string, termIds: string[]): Promise<void> {
  await api.post(`participant/applications/${encodeURIComponent(applicationId)}/change-requests`, {
    json: { termIds },
  })
}
