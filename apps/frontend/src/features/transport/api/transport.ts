import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

/** A ride with a place and time, or own transport: the participant gets there alone. */
const kindSchema = z.enum(["SCHEDULED", "OWN"])

const optionSchema = z.object({
  id: z.string(),
  kind: kindSchema,
  /** Empty for own transport: the UI shows the translated name. */
  name: z.string(),
  /** Empty for own transport. */
  departurePlace: z.string().nullable(),
  /** ISO instant; empty for own transport. */
  departureAt: z.string().nullable(),
  /** Free text for the participant: address, where to park, what to bring. */
  instructions: z.string().nullable(),
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
  terms: z.array(termSchema.extend({ transports: z.array(summarySchema) })),
})
const participantsSchema = termSchema.extend({
  name: z.string(),
  kind: kindSchema,
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
      options: z.array(optionSchema),
    }),
  ),
})

export type TransportSummary = z.infer<typeof summarySchema>
export type TransportOption = z.infer<typeof optionSchema>
export type TermTransport = z.infer<typeof eventTransportSchema>["terms"][number]
export type TransportKind = z.infer<typeof kindSchema>
export type TransportInput = {
  name?: string
  departurePlace?: string
  departureAt?: string
  instructions?: string
}

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

/** A new transport goes to a term, with a kind; neither changes for an existing one. */
export async function saveTransport(
  eventId: string,
  input: TransportInput,
  target: { termId: string; kind: TransportKind } | { id: string },
): Promise<void> {
  if ("id" in target) {
    await api.put(`${base(eventId)}/${encodeURIComponent(target.id)}`, { json: input })
  } else {
    await api.post(base(eventId), { json: { ...input, ...target } })
  }
}

/** Participants who chose it are left with no transport chosen. */
export async function deleteTransport(eventId: string, id: string): Promise<void> {
  await api.delete(`${base(eventId)}/${encodeURIComponent(id)}`)
}

export async function chooseTransport(
  applicationId: string,
  termId: string,
  transportId: string,
): Promise<void> {
  await api.put(ofApplication(applicationId), { json: { termId, transportId } })
}
