import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

// `accountType`, `mustSetPassword` and `locale` are BetterAuth additional fields set by
// the server (apps/backend/src/shared/auth/config/better-auth.config.ts).
export const accountTypeSchema = z.enum(["ORGANIZER", "PARTICIPANT", "ADMIN"])
export type AccountType = z.infer<typeof accountTypeSchema>

export const localeSchema = z.enum(["en", "cs"])
export type Locale = z.infer<typeof localeSchema>

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  accountType: accountTypeSchema,
  mustSetPassword: z.boolean(),
  // Preferred language of the account (UI and e-mails); BetterAuth additional field.
  locale: localeSchema.catch("en"),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

export type Session = {
  user: SessionUser
} | null

export const authSessionQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<Session> => {
      const { data, error } = await authClient.getSession()
      if (error) throw new Error(error.message ?? "Failed to load the session")
      if (!data?.user) return null
      return { user: sessionUserSchema.parse(data.user) }
    },
    staleTime: 30_000,
  })
