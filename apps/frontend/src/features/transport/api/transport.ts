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
const eventTransportSchema = z.object({
  eventName: z.string(),
  eventLocation: z.string().nullable(),
  transports: z.array(summarySchema),
  ownCount: z.number().int(),
})
const participantsSchema = z.object({
  name: z.string().nullable(),
  groups: z.array(
    z.object({
      termId: z.string(),
      termName: z.string().nullable(),
      startsOn: z.string(),
      endsOn: z.string(),
      participants: z.array(
        z.object({ applicationId: z.string(), name: z.string(), email: z.string() }),
      ),
    }),
  ),
})
const applicationTransportSchema = z.object({
  participantName: z.string(),
  eventName: z.string(),
  selectedTransportId: z.string().nullable(),
  options: z.array(optionSchema),
})

export type TransportOption = z.infer<typeof optionSchema>
export type TransportInput = Omit<TransportOption, "id">

const base = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}/transport`
const ofApplication = (applicationId: string) =>
  `participant/applications/${encodeURIComponent(applicationId)}/transport`

export const transportKeys = {
  event: (eventId: string) => ["events", eventId, "transport"] as const,
  participants: (eventId: string, id: string) =>
    ["events", eventId, "transport", id, "participants"] as const,
  application: (applicationId: string) => ["applications", applicationId, "transport"] as const,
}

export const eventTransportQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: transportKeys.event(eventId),
    queryFn: async () => eventTransportSchema.parse(await api.get(base(eventId)).json()),
  })

export const transportParticipantsQueryOptions = (eventId: string, id: string) =>
  queryOptions({
    queryKey: transportKeys.participants(eventId, id),
    queryFn: async () =>
      participantsSchema.parse(
        await api.get(`${base(eventId)}/${encodeURIComponent(id)}/participants`).json(),
      ),
  })

export const applicationTransportQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: transportKeys.application(applicationId),
    queryFn: async () =>
      applicationTransportSchema.parse(await api.get(ofApplication(applicationId)).json()),
  })

export async function saveTransport(
  eventId: string,
  input: TransportInput,
  id?: string,
): Promise<void> {
  if (id) await api.put(`${base(eventId)}/${encodeURIComponent(id)}`, { json: input })
  else await api.post(base(eventId), { json: input })
}

/** `null` chooses own transport. */
export async function chooseTransport(
  applicationId: string,
  transportId: string | null,
): Promise<void> {
  await api.put(ofApplication(applicationId), { json: { transportId } })
}
