import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  bankAccount: z.string(),
})

export type OrganizationProfile = z.infer<typeof organizationSchema>

const myOrganizationsSchema = z.object({
  organizations: z.array(z.object({ id: z.string(), name: z.string() })),
})

export const myOnboardingOrganizationsQueryOptions = () =>
  queryOptions({
    queryKey: ["organizer", "onboarding", "organizations"],
    queryFn: async () => myOrganizationsSchema.parse(await api.get("me").json()).organizations,
  })

export const organizationProfileQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["organizer", "onboarding", "organization", id],
    queryFn: async (): Promise<OrganizationProfile> =>
      organizationSchema.parse(await api.get(`organizer/organizations/${id}`).json()),
  })

export async function createOrganization(name: string): Promise<OrganizationProfile> {
  return organizationSchema.parse(
    await api.post("organizer/organizations", { json: { name } }).json(),
  )
}

export async function saveOrganizationProfile(
  id: string,
  input: { contactEmail: string; contactPhone?: string; bankAccount: string },
): Promise<OrganizationProfile> {
  return organizationSchema.parse(
    await api.put(`organizer/organizations/${id}/profile`, { json: input }).json(),
  )
}
