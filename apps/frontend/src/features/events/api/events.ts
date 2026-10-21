import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const organizerEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  /** Token of the application link `/apply/<publicToken>`. */
  publicToken: z.string(),
  createdAt: z.string(),
  termCount: z.number().int(),
  roomCount: z.number().int(),
  /** ISO dates of the first term start and the last term end; `null` without terms. */
  startsOn: z.string().nullable(),
  endsOn: z.string().nullable(),
  /** The application link works; otherwise the public page is a 404. */
  applicationsOpen: z.boolean(),
  missing: z.array(z.enum(["TERM", "ROOM"])),
})
export type OrganizerEvent = z.infer<typeof organizerEventSchema>

export const eventKeys = {
  all: () => ["organizer", "events"] as const,
  detail: (eventId: string) => [...eventKeys.all(), eventId] as const,
}

/** `GET /api/organizer/events` — events of the organizer's organizations. */
export const eventsQueryOptions = () =>
  queryOptions({
    queryKey: eventKeys.all(),
    queryFn: async (): Promise<OrganizerEvent[]> =>
      z.array(organizerEventSchema).parse(await api.get("organizer/events").json()),
  })

/** `GET /api/organizer/events/:eventId`. */
export const eventQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: eventKeys.detail(eventId),
    queryFn: async (): Promise<OrganizerEvent> =>
      organizerEventSchema.parse(
        await api.get(`organizer/events/${encodeURIComponent(eventId)}`).json(),
      ),
  })

export type NewEventInput = {
  organizationId: string
  name: string
  description?: string
  location?: string
}

/** `POST /api/organizer/events`. */
export async function createEvent(input: NewEventInput): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(await api.post("organizer/events", { json: input }).json())
}
