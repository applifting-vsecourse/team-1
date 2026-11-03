import { z } from "zod"

import { api } from "@/lib/api-client"

import { localeSchema, type Locale } from "@/features/auth/api/authSessionQueryOptions"

// What `PATCH /api/me` answers with (the rest of `MeResponseDto` is not needed).
export const profileSchema = z.object({ name: z.string().nullable(), locale: localeSchema })
export type Profile = z.infer<typeof profileSchema>

export type ProfileChange = { name: string; locale: Locale }

/** US-124: the signed-in user changes their name and preferred language. */
export async function updateProfile(change: ProfileChange): Promise<Profile> {
  return profileSchema.parse(await api.patch("me", { json: change }).json())
}
