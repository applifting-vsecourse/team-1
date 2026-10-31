import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const statusSchema = z.enum(["CONFIRMED", "WAITLISTED", "CANCELLED"])
export type TermStatus = z.infer<typeof statusSchema>

const termStatusSchema = z.object({
  termId: z.string(),
  name: z.string(),
  startsOn: z.string(),
  endsOn: z.string(),
  status: statusSchema,
  priceCzk: z.number().int(),
  /** Statuses the organizer may set now, decided by the server. */
  allowedStatuses: z.array(statusSchema),
  history: z.array(
    z.object({
      id: z.string(),
      fromStatus: statusSchema,
      toStatus: statusSchema,
      /** Null: the system changed the status. */
      changedByName: z.string().nullable(),
      changedAt: z.string(),
    }),
  ),
})
export type TermStatusDetail = z.infer<typeof termStatusSchema>

const path = (applicationId: string) =>
  `organizer/applications/${encodeURIComponent(applicationId)}/terms`

export const termStatusesQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "termStatuses", applicationId],
    queryFn: async () => z.array(termStatusSchema).parse(await api.get(path(applicationId)).json()),
  })

export async function changeTermStatus(
  applicationId: string,
  termId: string,
  status: TermStatus,
  isOverCapacityConfirmed: boolean,
) {
  await api.patch(`${path(applicationId)}/${encodeURIComponent(termId)}/status`, {
    json: { status, ...(isOverCapacityConfirmed ? { confirmOverCapacity: true } : {}) },
  })
}
