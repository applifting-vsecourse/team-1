import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const healthSchema = z.object({
  applicationId: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  /** `null` while the participant has not filled it in. */
  note: z.string().nullable(),
  /** When the explicit consent was given (ISO datetime); `null` together with the note. */
  consentAt: z.string().datetime().nullable(),
})
export type Health = z.infer<typeof healthSchema>

const ownPath = (applicationId: string) =>
  `participant/applications/${encodeURIComponent(applicationId)}/health`

/** `GET /api/participant/applications/:id/health` — the participant's own restriction (US-68). */
export const ownHealthQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["participant", "applications", applicationId, "health"],
    queryFn: async (): Promise<Health> =>
      healthSchema.parse(await api.get(ownPath(applicationId)).json()),
  })

/** `PUT /api/participant/applications/:id/health` — an empty note removes it. */
export async function saveHealth(
  applicationId: string,
  values: { note: string; consent: boolean },
): Promise<Health> {
  return healthSchema.parse(await api.put(ownPath(applicationId), { json: values }).json())
}

/** `GET /api/organizer/applications/:id/health` — organizers of the organization only. */
export const organizerHealthQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["organizer", "applications", applicationId, "health"],
    queryFn: async (): Promise<Health> =>
      healthSchema.parse(
        await api.get(`organizer/applications/${encodeURIComponent(applicationId)}/health`).json(),
      ),
  })
