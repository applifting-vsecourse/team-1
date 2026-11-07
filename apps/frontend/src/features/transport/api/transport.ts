import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

/** Pseudo id of own transport in URLs and requests: no transport chosen. */
export const OWN_TRANSPORT_ID = "own"

const optionSchema = z.object({
  id: z.string(),
  name: z.string(),
  departurePlace: z.string(),
  /** ISO instant. */
  departureAt: z.string(),
})
const summarySchema = optionSchema.extend({ participantsCount: z.number().int() })
const termSchema = z.object({
  termId: z.string(),
  termName: z.string().nullable(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
})
const eventTransportSchema = z.object({
  eventName: z.string(),
  eventLocation: z.string().nullable(),
  terms: z.array(
    termSchema.extend({ transports: z.array(summarySchema), ownCount: z.number().int() }),
  ),
})
const participantsSchema = termSchema.extend({
  name: z.string().nullable(),
  participants: z.array(
    z.object({ applicationId: z.string(), name: z.string(), email: z.string() }),
  ),
})
const applicationTransportSchema = z.object({
  participantName: z.string(),
  eventName: z.string(),
  terms: z.array(
    termSchema.extend({
      status: z.string(),
      selectedTransportId: z.string().nullable(),
      isOwn: z.boolean(),
      options: z.array(optionSchema),
    }),
  ),
})

export type TransportOption = z.infer<typeof optionSchema>
export type TermTransport = z.infer<typeof eventTransportSchema>["terms"][number]
export type TransportInput = Omit<TransportOption, "id">

const base = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}/transport`
const ofApplication = (applicationId: string) =>
  `participant/applications/${encodeURIComponent(applicationId)}/transport`

export const transportKeys = {
  event: (eventId: string) => ["events", eventId, "transport"] as const,
  participants: (eventId: string, id: string, termId: string) =>
    ["events", eventId, "transport", id, termId, "participants"] as const,
  application: (applicationId: string) => ["applications", applicationId, "transport"] as const,
}

export const eventTransportQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: transportKeys.event(eventId),
    queryFn: async () => eventTransportSchema.parse(await api.get(base(eventId)).json()),
  })

/** `termId` is only needed for own transport, which belongs to no transport row. */
export const transportParticipantsQueryOptions = (eventId: string, id: string, termId = "") =>
  queryOptions({
    queryKey: transportKeys.participants(eventId, id, termId),
    queryFn: async () =>
      participantsSchema.parse(
        await api
          .get(`${base(eventId)}/${encodeURIComponent(id)}/participants`, {
            searchParams: id === OWN_TRANSPORT_ID ? { termId } : undefined,
          })
          .json(),
      ),
  })

export const applicationTransportQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: transportKeys.application(applicationId),
    queryFn: async () =>
      applicationTransportSchema.parse(await api.get(ofApplication(applicationId)).json()),
  })

/** A new transport goes to a term; the term of an existing one does not change. */
export async function saveTransport(
  eventId: string,
  input: TransportInput,
  target: { termId: string } | { id: string },
): Promise<void> {
  if ("id" in target) {
    await api.put(`${base(eventId)}/${encodeURIComponent(target.id)}`, { json: input })
  } else {
    await api.post(base(eventId), { json: { ...input, termId: target.termId } })
  }
}

/** `null` chooses own transport. */
export async function chooseTransport(
  applicationId: string,
  termId: string,
  transportId: string | null,
): Promise<void> {
  await api.put(ofApplication(applicationId), { json: { termId, transportId } })
}
