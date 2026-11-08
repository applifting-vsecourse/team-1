import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

export const eventTermSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  roomMode: z.enum(["GENDERED", "SHARED"]),
  roomCount: z.number().int(),
  /** All beds of the term's own rooms. */
  capacity: z.number().int(),
  confirmedCount: z.number().int(),
})
export type EventTermSummary = z.infer<typeof eventTermSummarySchema>

export const evaluationModeSchema = z.enum(["AUTOMATIC", "MANUAL"])
export type EvaluationMode = z.infer<typeof evaluationModeSchema>

export const organizerEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  /** Listed in the public catalog (US-122); off until the organizer turns it on. */
  publishedInCatalog: z.boolean(),
  /** File name of the page photo; `null` without one. */
  photoFileName: z.string().nullable(),
  /** Token of the application link `/apply/<publicToken>`. */
  publicToken: z.string(),
  createdAt: z.string(),
  termCount: z.number().int(),
  /** ISO dates of the first term start and the last term end; `null` without terms. */
  startsOn: z.string().nullable(),
  endsOn: z.string().nullable(),
  /** The application link works; otherwise the public page is a 404. */
  applicationsOpen: z.boolean(),
  evaluationMode: evaluationModeSchema,
  /** ISO day; null means participant changes do not wait for approval. */
  cancellationStartsOn: z.string().nullable(),
  /** Free text shown to applicants (US-47); null until the organizer writes it. */
  cancellationTerms: z.string().nullable(),
  /** Applications are open, so the mode can no longer change. */
  evaluationModeLocked: z.boolean(),
  /** At least one application exists; the event can no longer be deleted. */
  hasApplications: z.boolean(),
  missing: z.array(z.enum(["TERM", "ROOM"])),
  /** Terms that are still offered, in chronological order. */
  terms: z.array(eventTermSummarySchema),
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

/** `DELETE /api/organizer/events/:eventId` — only an event nobody has applied to (409 otherwise). */
export async function deleteEvent(eventId: string): Promise<void> {
  await api.delete(`organizer/events/${encodeURIComponent(eventId)}`)
}

/** `PATCH /api/organizer/events/:eventId/evaluation-mode` — 409 once applications are open. */
export async function setEvaluationMode(
  eventId: string,
  evaluationMode: EvaluationMode,
): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(
    await api
      .patch(`organizer/events/${encodeURIComponent(eventId)}/evaluation-mode`, {
        json: { evaluationMode },
      })
      .json(),
  )
}

/** `PUT /api/organizer/events/:eventId/cancellation-start` — null clears the date. */
export async function setCancellationStart(
  eventId: string,
  cancellationStartsOn: string | null,
): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(
    await api
      .put(`organizer/events/${encodeURIComponent(eventId)}/cancellation-start`, {
        json: { cancellationStartsOn },
      })
      .json(),
  )
}

/** `PUT /api/organizer/events/:eventId/cancellation-terms` — the text applicants see (US-47). */
export async function setCancellationTerms(
  eventId: string,
  cancellationTerms: string,
): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(
    await api
      .put(`organizer/events/${encodeURIComponent(eventId)}/cancellation-terms`, {
        json: { cancellationTerms },
      })
      .json(),
  )
}

export const CANCELLATION_TERMS_MAX_LENGTH = 2000

export type PublicPageInput = {
  name: string
  description: string
  location: string
  contactEmail: string
  contactPhone: string
  publishedInCatalog: boolean
}

/** `PUT /api/organizer/events/:eventId/public-page` — 400 `PUBLIC_PAGE_INCOMPLETE` for the catalog. */
export async function savePublicPage(
  eventId: string,
  input: PublicPageInput,
): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(
    await api
      .put(`organizer/events/${encodeURIComponent(eventId)}/public-page`, { json: input })
      .json(),
  )
}

/** `PUT /api/organizer/events/:eventId/photo` — the image itself is the body (JPEG / PNG, up to 2 MB). */
export async function uploadEventPhoto(eventId: string, file: File): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(
    await api
      .put(`organizer/events/${encodeURIComponent(eventId)}/photo`, {
        body: file,
        headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
      })
      .json(),
  )
}

/** `DELETE /api/organizer/events/:eventId/photo`. */
export async function deleteEventPhoto(eventId: string): Promise<OrganizerEvent> {
  return organizerEventSchema.parse(
    await api.delete(`organizer/events/${encodeURIComponent(eventId)}/photo`).json(),
  )
}

export const eventPhotoKey = (eventId: string) => [...eventKeys.detail(eventId), "photo"] as const

/** `GET /api/organizer/events/:eventId/photo` — the image for the preview in the form. */
export const eventPhotoQueryOptions = (eventId: string, isEnabled: boolean) =>
  queryOptions({
    queryKey: eventPhotoKey(eventId),
    // A data URL, so the preview needs no object URL to release.
    queryFn: async (): Promise<string> => {
      const blob = await api.get(`organizer/events/${encodeURIComponent(eventId)}/photo`).blob()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ""
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      }
      return `data:${blob.type};base64,${btoa(binary)}`
    },
    enabled: isEnabled,
  })

/** The photo limits the server enforces, checked here too so a bad file fails at once. */
export const EVENT_PHOTO = {
  maxBytes: 2 * 1024 * 1024,
  types: ["image/jpeg", "image/png"],
} as const
