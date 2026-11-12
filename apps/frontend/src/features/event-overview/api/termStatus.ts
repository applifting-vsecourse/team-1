import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { substituteRecordSchema } from "@/features/event-overview/api/substituteRecords"

const statusSchema = z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"])
/** A status the organizer can set; nothing leads back to "to evaluate". */
const targetSchema = z.enum(["CONFIRMED", "WAITLISTED", "CANCELLED"])
export type TermStatus = z.infer<typeof targetSchema>

const termStatusSchema = z.object({
  termId: z.string(),
  name: z.string().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  status: statusSchema,
  priceCzk: z.number().int(),
  owedCzk: z.number().int(),
  capacity: z.number().int(),
  occupied: z.number().int(),
  confirmationCapacity: z.number().int(),
  confirmationOccupied: z.number().int(),
  confirmationDueCzk: z.number().int(),
  /** Statuses the organizer may set now, decided by the server. */
  allowedStatuses: z.array(targetSchema),
  history: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["STATUS_CHANGED", "CREATED_BY_ORGANIZER"]),
      fromStatus: statusSchema,
      toStatus: statusSchema,
      /** Null: the system changed the status. */
      changedByName: z.string().nullable(),
      changedAt: z.string(),
    }),
  ),
  /** Confirmations from the waitlist that confirmed or skipped this application (US-105). */
  substituteRecords: z.array(substituteRecordSchema),
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
