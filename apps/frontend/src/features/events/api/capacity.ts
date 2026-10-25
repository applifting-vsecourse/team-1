import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { i18n } from "@/i18n"
import { api } from "@/lib/api-client"

const counts = z.object({ FEMALE: z.number().int(), MALE: z.number().int() })
export const capacitySchema = z.object({
  eventName: z.string(),
  roomMode: z.enum(["GENDERED", "SHARED"]),
  rooms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      gender: z.enum(["FEMALE", "MALE"]).nullable(),
      capacity: z.number().int().min(1),
    }),
  ),
  terms: z.array(
    z.object({
      termId: z.string(),
      name: z.string(),
      startsOn: z.string(),
      endsOn: z.string(),
      capacity: counts,
      freePlaces: counts,
    }),
  ),
})
export type EventCapacity = z.infer<typeof capacitySchema>
export const capacityQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["events", eventId, "capacity"],
    queryFn: async (): Promise<EventCapacity> => {
      const result = capacitySchema.safeParse(
        await api.get(`organizer/events/${encodeURIComponent(eventId)}/capacity/details`).json(),
      )
      if (!result.success) throw new Error(i18n.t("errors:INVALID_RESPONSE"))
      return result.data
    },
  })
