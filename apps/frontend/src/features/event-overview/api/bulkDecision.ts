import { z } from "zod"

import { api } from "@/lib/api-client"

export type BulkDecision = "WAITLIST" | "REJECT"

const resultSchema = z.object({
  changed: z.array(z.string()),
  unchanged: z.array(z.string()),
})
export type BulkDecisionResult = z.infer<typeof resultSchema>

export async function decideSelected(
  eventId: string,
  termId: string,
  decision: BulkDecision,
  applicationIds: string[],
): Promise<BulkDecisionResult> {
  return resultSchema.parse(
    await api
      .post(
        `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/bulk-decision`,
        { json: { decision, applicationIds } },
      )
      .json(),
  )
}
