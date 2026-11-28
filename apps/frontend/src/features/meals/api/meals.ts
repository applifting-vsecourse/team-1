import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const optionSchema = z.object({ id: z.string(), name: z.string() })
export type MealOption = z.infer<typeof optionSchema>

const optionsSchema = z.array(optionSchema)

const ownMealsSchema = z.object({
  applicationId: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  /** The restrictions the organizer offers for the event. */
  options: optionsSchema,
  selectedOptionIds: z.array(z.string()),
  /** `null` while nothing is written. */
  allergies: z.string().nullable(),
  specialRequest: z.string().nullable(),
  /** The participant confirmed having no meal restriction (US-150). */
  noRestrictions: z.boolean(),
  /** Until the last term that is not cancelled is over (D-192); the same for both roles. */
  editable: z.boolean(),
})
export type OwnMeals = z.infer<typeof ownMealsSchema>

const kitchenTermSchema = z.object({
  termId: z.string(),
  name: z.string().nullable(),
  /** ISO date, `2027-07-04`. */
  startsOn: z.string(),
  endsOn: z.string(),
  total: z.number().int(),
  /** Confirmed participants without any ticked restriction. */
  regular: z.number().int(),
  options: z.array(optionSchema.extend({ count: z.number().int() })),
  allergies: z.array(
    z.object({
      applicationId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      allergies: z.string(),
    }),
  ),
  specialRequests: z.array(
    z.object({
      applicationId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      specialRequest: z.string(),
    }),
  ),
  /** Later arrival / earlier departure, Prague wall time `yyyy-MM-ddTHH:mm` (US-143). */
  stays: z.array(
    z.object({
      applicationId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      lateArrival: z.string().nullable(),
      earlyDeparture: z.string().nullable(),
    }),
  ),
})
export type KitchenTerm = z.infer<typeof kitchenTermSchema>

const kitchenSummarySchema = z.array(kitchenTermSchema)

const ownPath = (applicationId: string) =>
  `participant/applications/${encodeURIComponent(applicationId)}/meals`
const eventPath = (eventId: string) => `organizer/events/${encodeURIComponent(eventId)}/meals`

/** `GET /api/participant/applications/:id/meals` — offered restrictions and the ticked ones (US-64). */
export const ownMealsQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["participant", "applications", applicationId, "meals"],
    queryFn: async (): Promise<OwnMeals> =>
      ownMealsSchema.parse(await api.get(ownPath(applicationId)).json()),
  })

/** `PUT /api/participant/applications/:id/meals` — an empty text clears the allergies. */
export async function saveOwnMeals(
  applicationId: string,
  values: {
    optionIds: string[]
    allergies: string
    specialRequest: string
    noRestrictions: boolean
  },
): Promise<OwnMeals> {
  return ownMealsSchema.parse(await api.put(ownPath(applicationId), { json: values }).json())
}

/** `GET /api/organizer/events/:id/meals/options` — the restrictions the event offers. */
export const mealOptionsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["organizer", "events", eventId, "meals", "options"],
    queryFn: async (): Promise<MealOption[]> =>
      optionsSchema.parse(await api.get(`${eventPath(eventId)}/options`).json()),
  })

/** `PUT /api/organizer/events/:id/meals/options` — replaces the list; options without `id` are new. */
export async function saveMealOptions(
  eventId: string,
  options: { id?: string; name: string }[],
): Promise<MealOption[]> {
  return optionsSchema.parse(
    await api.put(`${eventPath(eventId)}/options`, { json: { options } }).json(),
  )
}

/** `GET /api/organizer/events/:id/meals/summary` — counts and allergies per active term. */
export const kitchenSummaryQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["organizer", "events", eventId, "meals", "summary"],
    queryFn: async (): Promise<KitchenTerm[]> =>
      kitchenSummarySchema.parse(await api.get(`${eventPath(eventId)}/summary`).json()),
  })

const organizerMealsSchema = ownMealsSchema
export type OrganizerMeals = z.infer<typeof organizerMealsSchema>
export type MealSelection = Parameters<typeof saveOwnMeals>[1]

const applicationPath = (eventId: string, id: string) =>
  `${eventPath(eventId)}/applications/${encodeURIComponent(id)}`

export const organizerMealsQueryOptions = (eventId: string, id: string) =>
  queryOptions({
    queryKey: ["organizer", "events", eventId, "meals", "application", id],
    queryFn: async () =>
      organizerMealsSchema.parse(await api.get(applicationPath(eventId, id)).json()),
  })

export const mealRosterQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: ["organizer", "events", eventId, "meals", "roster", termId],
    queryFn: async () =>
      z
        .array(organizerMealsSchema)
        .parse(
          await api
            .get(`${eventPath(eventId)}/terms/${encodeURIComponent(termId)}/participants`)
            .json(),
        ),
  })

export async function saveOrganizerMeals(eventId: string, id: string, values: MealSelection) {
  return organizerMealsSchema.parse(
    await api.put(applicationPath(eventId, id), { json: values }).json(),
  )
}
