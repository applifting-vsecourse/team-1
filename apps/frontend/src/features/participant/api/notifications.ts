import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const notificationSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  eventName: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  readAt: z.string().nullable(),
})

export const participantNotificationsQueryOptions = () =>
  queryOptions({
    queryKey: ["participant", "change-request-notifications"],
    queryFn: async () =>
      z
        .array(notificationSchema)
        .parse(await api.get("participant/change-request-notifications").json()),
  })

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`participant/change-request-notifications/${encodeURIComponent(id)}/read`)
}
