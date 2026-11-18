import { z } from "zod"

import { api } from "@/lib/api-client"

import { localeSchema, type Locale } from "@/features/auth/api/authSessionQueryOptions"

// What `PATCH /api/me` answers with (the rest of `MeResponseDto` is not needed).
export const profileSchema = z.object({
  name: z.string().nullable(),
  locale: localeSchema.nullable(),
})
export type Profile = z.infer<typeof profileSchema>

/** Only what changes is sent: a name edit must not turn an unset language into a chosen one. */
export type ProfileChange = { name?: string; locale?: Locale }

/** US-124, US-128: the signed-in user changes their name and/or preferred language. */
export async function updateProfile(change: ProfileChange): Promise<Profile> {
  return profileSchema.parse(await api.patch("me", { json: change }).json())
}
