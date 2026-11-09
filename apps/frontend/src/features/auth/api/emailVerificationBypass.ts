import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const statusSchema = z.object({ enabled: z.boolean() })

/**
 * Staging and demo only: whether the backend lets an organizer skip the verification
 * link (EMAIL_VERIFICATION_BYPASS_ENABLED). Anything unexpected counts as off.
 */
export const emailVerificationBypassQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "email-verification-bypass"],
    queryFn: async () => {
      const parsed = statusSchema.safeParse(
        await api.get("email-verification-bypass/status").json(),
      )
      return parsed.success && parsed.data.enabled
    },
    staleTime: Infinity,
    retry: false,
  })

/** The sign-up response carries the one-time token of this registration while the bypass is on. */
const signUpResultSchema = z.object({ emailVerificationBypassToken: z.string().optional() })

export function bypassTokenOf(signUpResult: unknown): string | undefined {
  const parsed = signUpResultSchema.safeParse(signUpResult)
  return parsed.success ? parsed.data.emailVerificationBypassToken : undefined
}

/** Verifies the just-registered account with its token and signs it in (session cookie). */
export async function verifyEmailWithoutLink(token: string): Promise<void> {
  await api.post("email-verification-bypass", { json: { token } })
}
