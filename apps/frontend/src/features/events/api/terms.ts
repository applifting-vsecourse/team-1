import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/events/api/events"

export const termSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
  priceCzk: z.number().int(),
  /** Beds of the event's rooms. */
  capacity: z.number().int(),
  confirmedCount: z.number().int(),
  waitlistedCount: z.number().int(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
})
export type EventTerm = z.infer<typeof termSchema>

export type TermInput = {
  name: string
  startsOn: string
  endsOn: string
  priceCzk: number
}

export const termKeys = {
  list: (eventId: string) => [...eventKeys.detail(eventId), "terms"] as const,
}

const termsPath = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}/terms`

/** `GET /api/organizer/events/:eventId/terms` — active terms by date, then cancelled ones. */
export const termsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: termKeys.list(eventId),
    queryFn: async (): Promise<EventTerm[]> =>
      z.array(termSchema).parse(await api.get(termsPath(eventId)).json()),
  })

/** `POST /api/organizer/events/:eventId/terms`. */
export async function createTerm(eventId: string, input: TermInput): Promise<EventTerm> {
  return termSchema.parse(await api.post(termsPath(eventId), { json: input }).json())
}

/** `PATCH /api/organizer/events/:eventId/terms/:termId`. */
export async function updateTerm(
  eventId: string,
  termId: string,
  input: TermInput,
): Promise<EventTerm> {
  return termSchema.parse(
    await api.patch(`${termsPath(eventId)}/${encodeURIComponent(termId)}`, { json: input }).json(),
  )
}

/** `POST /api/organizer/events/:eventId/terms/:termId/cancel`. */
export async function cancelTerm(
  eventId: string,
  termId: string,
  reason: string,
): Promise<EventTerm> {
  return termSchema.parse(
    await api
      .post(`${termsPath(eventId)}/${encodeURIComponent(termId)}/cancel`, { json: { reason } })
      .json(),
  )
}
