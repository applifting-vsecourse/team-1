import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const changeRequestSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  eventId: z.string(),
  participantName: z.string(),
  participantGender: z.enum(["FEMALE", "MALE"]),
  currentTermIds: z.array(z.string()),
  requestedTermIds: z.array(z.string()),
  currentPriceCzk: z.number().int(),
  requestedPriceCzk: z.number().int(),
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
export type EventChangeRequest = z.infer<typeof changeRequestSchema>

export const eventChangeRequestsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "change-requests", eventId],
    queryFn: async () =>
      z
        .array(changeRequestSchema)
        .parse(
          await api.get(`organizer/events/${encodeURIComponent(eventId)}/change-requests`).json(),
        ),
  })

export async function decideChangeRequest(
  eventId: string,
  requestId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<void> {
  await api.patch(
    `organizer/events/${encodeURIComponent(eventId)}/change-requests/${encodeURIComponent(requestId)}/${decision}`,
    { json: decision === "reject" ? { reason } : {} },
  )
}
