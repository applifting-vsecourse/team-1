import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { authClient } from "@/features/auth/lib/auth-client"

const statusSchema = z.object({ enabled: z.boolean() })

/**
 * Staging and demo only: whether the backend lets an organizer skip the verification
 * link (EMAIL_VERIFICATION_BYPASS_ENABLED). Anything unexpected counts as off.
 */
export const emailVerificationBypassQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "email-verification-bypass"],
    queryFn: async () => {
      const { data } = await authClient.$fetch("/email-verification-bypass/status")
      const parsed = statusSchema.safeParse(data)
      return parsed.success && parsed.data.enabled
    },
    staleTime: Infinity,
    retry: false,
  })

export type BypassResult = { status: number } | null

/** Verifies the just-registered account and signs it in; the password proves it is the registrant. */
export async function verifyEmailWithoutLink(
  email: string,
  password: string,
): Promise<BypassResult> {
  const { error } = await authClient.$fetch("/email-verification-bypass", {
    method: "POST",
    body: { email, password },
  })
  return error ? { status: error.status } : null
}
