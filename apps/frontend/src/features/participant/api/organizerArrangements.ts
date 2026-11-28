import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const termSchema = z.object({
  termId: z.string(),
  name: z.string().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  status: z.string(),
  /** The term is not over: wishes and stay can still be changed. */
  editable: z.boolean(),
  /** Only for a confirmed term of a participant without individual accommodation (US-146). */
  roomWishes: z
    .object({
      names: z.array(z.string()),
      noRoomWishes: z.boolean(),
      /** „No wishes“ can still be confirmed: no names and the rooms are not published. */
      canDecline: z.boolean(),
    })
    .optional(),
  /** Prague wall time `yyyy-MM-ddTHH:mm`; absent for a cancelled or archived term (US-143). */
  stay: z
    .object({ lateArrival: z.string().nullable(), earlyDeparture: z.string().nullable() })
    .optional(),
})

const arrangementsSchema = z.object({
  applicationId: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  terms: z.array(termSchema),
})
export type Arrangements = z.infer<typeof arrangementsSchema>

/** `GET /api/organizer/applications/:id/arrangements` — what the participant writes per term (D-191). */
export const organizerArrangementsQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["organizer", "applications", applicationId, "arrangements"],
    queryFn: async (): Promise<Arrangements> =>
      arrangementsSchema.parse(
        await api
          .get(`organizer/applications/${encodeURIComponent(applicationId)}/arrangements`)
          .json(),
      ),
  })
