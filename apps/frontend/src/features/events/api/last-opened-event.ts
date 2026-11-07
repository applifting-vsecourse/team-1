import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const lastOpenedEventSchema = z.object({ eventId: z.string().nullable() })

/**
 * `GET /api/organizer/last-opened-event` — the event the organizer opened last, on any device
 * (US-51); `null` without one or when it is no longer theirs. Never cached: where login lands
 * must follow the latest opening.
 */
export const lastOpenedEventQueryOptions = () =>
  queryOptions({
    queryKey: ["organizer", "lastOpenedEvent"],
    staleTime: 0,
    queryFn: async ({ signal }) =>
      lastOpenedEventSchema.parse(await api.get("organizer/last-opened-event", { signal }).json())
        .eventId,
  })

/** `PUT /api/organizer/events/:eventId/last-opened` — remember the event as the last opened. */
export async function rememberLastOpenedEvent(eventId: string): Promise<void> {
  await api.put(`organizer/events/${encodeURIComponent(eventId)}/last-opened`)
}
