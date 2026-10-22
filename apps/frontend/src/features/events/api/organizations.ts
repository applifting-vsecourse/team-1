import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const organizationSchema = z.object({ id: z.string(), name: z.string() })
export type OrganizationSummary = z.infer<typeof organizationSchema>

/** `GET /api/me` — the organizations the signed-in organizer acts for. */
export const myOrganizationsQueryOptions = () =>
  queryOptions({
    queryKey: ["organizer", "organizations"],
    queryFn: async (): Promise<OrganizationSummary[]> =>
      z.object({ organizations: z.array(organizationSchema) }).parse(await api.get("me").json())
        .organizations,
  })
