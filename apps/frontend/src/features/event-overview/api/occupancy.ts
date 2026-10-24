import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const figuresSchema = z.object({
  capacity: z.number().int(),
  confirmed: z.number().int(),
  /** Capacity minus confirmed; negative when the term is overbooked. */
  free: z.number().int(),
  waitlisted: z.number().int(),
})
const termOccupancySchema = figuresSchema.extend({
  id: z.string(),
  name: z.string(),
  startsOn: z.string(),
  endsOn: z.string(),
  /** Per gender in gendered rooms, `null` with shared rooms. */
  byGender: z.object({ FEMALE: figuresSchema, MALE: figuresSchema }).nullable(),
})
const occupancySchema = z.object({
  eventId: z.string(),
  roomMode: z.enum(["GENDERED", "SHARED"]),
  roomCount: z.number().int(),
  terms: z.array(termOccupancySchema),
})
export type OccupancyFigures = z.infer<typeof figuresSchema>
export type TermOccupancy = z.infer<typeof termOccupancySchema>
export type EventOccupancy = z.infer<typeof occupancySchema>

export const occupancyQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["events", eventId, "occupancy"],
    queryFn: async () =>
      occupancySchema.parse(
        await api.get(`organizer/events/${encodeURIComponent(eventId)}/occupancy`).json(),
      ),
  })
