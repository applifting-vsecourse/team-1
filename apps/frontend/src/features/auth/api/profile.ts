import { z } from "zod"

import { api } from "@/lib/api-client"

export const profileLocaleSchema = z.enum(["en", "cs"])
export type ProfileLocale = z.infer<typeof profileLocaleSchema>

// What `PATCH /api/me` answers with (the rest of `MeResponseDto` is not needed).
export const profileSchema = z.object({ name: z.string().nullable(), locale: profileLocaleSchema })
export type Profile = z.infer<typeof profileSchema>

export type ProfileChange = { name: string; locale: ProfileLocale }

/** US-124: the signed-in user changes their name and preferred language. */
export async function updateProfile(change: ProfileChange): Promise<Profile> {
  return profileSchema.parse(await api.patch("me", { json: change }).json())
}
