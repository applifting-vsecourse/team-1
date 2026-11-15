import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const blockSchema = z.object({
  id: z.string(),
  /** ISO day within the term, `2027-07-13`. */
  date: z.string(),
  /** Wall-clock `HH:mm`, no time zone. */
  startTime: z.string(),
  endTime: z.string(),
  name: z.string(),
  place: z.string().nullable(),
  description: z.string().nullable(),
})
const termSchema = z.object({
  termId: z.string(),
  termName: z.string().nullable(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
  /** By day, then by time. */
  blocks: z.array(blockSchema),
})
const eventProgramSchema = z.object({ eventName: z.string(), terms: z.array(termSchema) })
const applicationProgramSchema = z.object({
  participantName: z.string(),
  eventName: z.string(),
  terms: z.array(termSchema),
})

export type ProgramBlock = z.infer<typeof blockSchema>
export type TermProgram = z.infer<typeof termSchema>
export type ProgramBlockInput = {
  date: string
  startTime: string
  endTime: string
  name: string
  place: string
  description: string
}

const base = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}/program`
const ofApplication = (applicationId: string) =>
  `participant/applications/${encodeURIComponent(applicationId)}/program`

export const programKeys = {
  event: (eventId: string) => ["events", eventId, "program"] as const,
  application: (applicationId: string) => ["applications", applicationId, "program"] as const,
}

export const eventProgramQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: programKeys.event(eventId),
    queryFn: async () => eventProgramSchema.parse(await api.get(base(eventId)).json()),
  })

/** Only the terms the participant is confirmed in; read live, so a change shows at once. */
export const applicationProgramQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: programKeys.application(applicationId),
    queryFn: async () =>
      applicationProgramSchema.parse(await api.get(ofApplication(applicationId)).json()),
  })

/** A new block goes to a term; an existing one is addressed by its id. */
export async function saveProgramBlock(
  eventId: string,
  input: ProgramBlockInput,
  target: { termId: string } | { id: string },
): Promise<void> {
  if ("id" in target) {
    await api.put(`${base(eventId)}/blocks/${encodeURIComponent(target.id)}`, { json: input })
  } else {
    await api.post(`${base(eventId)}/terms/${encodeURIComponent(target.termId)}/blocks`, {
      json: input,
    })
  }
}

export async function deleteProgramBlock(eventId: string, id: string): Promise<void> {
  await api.delete(`${base(eventId)}/blocks/${encodeURIComponent(id)}`)
}
