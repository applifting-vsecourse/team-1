import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"

export const catalogEventSchema = z.object({
  /** Token of the application link `/apply/<publicToken>` and of the event page. */
  publicToken: z.string(),
  name: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  location: z.string().nullable(),
  /** ISO dates of every term, by start date. */
  terms: z.array(
    z.object({ name: z.string().nullable(), startsOn: z.string(), endsOn: z.string() }),
  ),
  termCount: z.number().int(),
  /** Lowest term price, whole CZK. */
  fromPriceCzk: z.number().int().nullable(),
  isOpenForApplications: z.boolean(),
})
export type CatalogEvent = z.infer<typeof catalogEventSchema>

export const catalogSchema = z.object({
  organizations: z.array(z.object({ id: z.string(), name: z.string() })),
  events: z.array(catalogEventSchema),
})
export type Catalog = z.infer<typeof catalogSchema>

export const catalogEventDetailSchema = z.object({
  publicToken: z.string(),
  name: z.string(),
  organizationName: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  terms: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      startsOn: z.string(),
      endsOn: z.string(),
      priceCzk: z.number().int(),
    }),
  ),
  /** The photo is loaded from `public/catalog/events/:publicToken/photo`. */
  hasPhoto: z.boolean(),
  isOpenForApplications: z.boolean(),
})
export type CatalogEventDetail = z.infer<typeof catalogEventDetailSchema>

/** URL of the photo of a published event, for an `<img>`. */
export const catalogEventPhotoUrl = (publicToken: string) =>
  `${env.VITE_API_URL}/public/catalog/events/${encodeURIComponent(publicToken)}/photo`

/** Published events and their organizations: `GET /api/public/catalog`. */
export const catalogQueryOptions = () =>
  queryOptions({
    queryKey: ["public-catalog"],
    queryFn: async (): Promise<Catalog> =>
      catalogSchema.parse(await api.get("public/catalog").json()),
  })

/** The page of a published event: `GET /api/public/catalog/events/:publicToken`. */
export const catalogEventQueryOptions = (publicToken: string) =>
  queryOptions({
    queryKey: ["public-catalog", "event", publicToken],
    queryFn: async (): Promise<CatalogEventDetail> =>
      catalogEventDetailSchema.parse(
        await api.get(`public/catalog/events/${encodeURIComponent(publicToken)}`).json(),
      ),
  })
