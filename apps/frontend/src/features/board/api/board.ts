import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const termSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  /** ISO dates, `2027-07-12`. */
  startsOn: z.string(),
  endsOn: z.string(),
})
export type BoardTerm = z.infer<typeof termSchema>

const participantPostItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** The beginning of the text, cut on the server. */
  excerpt: z.string(),
  /** ISO instant. */
  createdAt: z.string(),
  eventName: z.string(),
  /** Only the terms the account is in. */
  terms: z.array(termSchema),
  isNew: z.boolean(),
})
const participantPostSchema = participantPostItemSchema.extend({ body: z.string() })
const summarySchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  latest: z.object({ id: z.string(), title: z.string() }).nullable(),
})

const organizerPostItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  source: z.enum(["MANUAL", "BULK_MESSAGE"]),
  terms: z.array(termSchema),
})
const organizerPostSchema = organizerPostItemSchema.extend({ body: z.string() })

export type ParticipantPostItem = z.infer<typeof participantPostItemSchema>
export type ParticipantPost = z.infer<typeof participantPostSchema>
export type BoardSummary = z.infer<typeof summarySchema>
export type OrganizerPostItem = z.infer<typeof organizerPostItemSchema>
export type OrganizerPost = z.infer<typeof organizerPostSchema>
export type PostInput = { title: string; body: string; termIds: string[] }

export const boardKeys = {
  all: ["board"] as const,
  list: () => [...boardKeys.all, "list"] as const,
  post: (id: string) => [...boardKeys.all, "post", id] as const,
  summary: () => [...boardKeys.all, "summary"] as const,
  event: (eventId: string) => [...boardKeys.all, "events", eventId] as const,
  eventTerms: (eventId: string) => [...boardKeys.event(eventId), "terms"] as const,
  eventPost: (eventId: string, id: string) => [...boardKeys.event(eventId), "post", id] as const,
}

const organizerBase = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}/board`

// --- Applicant ---

/** `GET /api/participant/board` — the posts of the account's terms, newest first. */
export const boardQueryOptions = () =>
  queryOptions({
    queryKey: boardKeys.list(),
    queryFn: async () =>
      z.array(participantPostItemSchema).parse(await api.get("participant/board").json()),
  })

/** `GET /api/participant/board/posts/:id` — the whole text. */
export const boardPostQueryOptions = (id: string) =>
  queryOptions({
    queryKey: boardKeys.post(id),
    queryFn: async () =>
      participantPostSchema.parse(
        await api.get(`participant/board/posts/${encodeURIComponent(id)}`).json(),
      ),
  })

/** `GET /api/participant/board/summary` — the number of new posts and the newest one. */
export const boardSummaryQueryOptions = () =>
  queryOptions({
    queryKey: boardKeys.summary(),
    queryFn: async () => summarySchema.parse(await api.get("participant/board/summary").json()),
  })

/** `POST /api/participant/board/posts/:id/read` — also reads the post's notification. */
export async function markPostRead(id: string): Promise<void> {
  await api.post(`participant/board/posts/${encodeURIComponent(id)}/read`)
}

// --- Organizer ---

export const eventPostsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: boardKeys.event(eventId),
    queryFn: async () =>
      z
        .array(organizerPostItemSchema)
        .parse(await api.get(`${organizerBase(eventId)}/posts`).json()),
  })

/** The active terms of the event, the choice in the post dialog. */
export const eventTermsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: boardKeys.eventTerms(eventId),
    queryFn: async () =>
      z.array(termSchema).parse(await api.get(`${organizerBase(eventId)}/terms`).json()),
  })

export const eventPostQueryOptions = (eventId: string, id: string) =>
  queryOptions({
    queryKey: boardKeys.eventPost(eventId, id),
    queryFn: async () =>
      organizerPostSchema.parse(
        await api.get(`${organizerBase(eventId)}/posts/${encodeURIComponent(id)}`).json(),
      ),
  })

/** Publishes a new post, or saves the changes of the one named by `id`. */
export async function savePost(eventId: string, input: PostInput, id?: string): Promise<void> {
  if (id) {
    await api.put(`${organizerBase(eventId)}/posts/${encodeURIComponent(id)}`, { json: input })
  } else await api.post(`${organizerBase(eventId)}/posts`, { json: input })
}

export async function deletePost(eventId: string, id: string): Promise<void> {
  await api.delete(`${organizerBase(eventId)}/posts/${encodeURIComponent(id)}`)
}
