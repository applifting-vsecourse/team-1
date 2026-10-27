import type { QueryClient } from "@tanstack/react-query"
import type { ParsedLocation } from "@tanstack/react-router"
import { redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

/**
 * Loader for the set-password page, where the magic link lands after the click.
 * Only a participant still without a password stays; one who already has a
 * password goes on to their applications.
 */
export async function guardSetPassword(queryClient: QueryClient, location: ParsedLocation) {
  const session = await queryClient.ensureQueryData(authSessionQueryOptions())
  if (!session) {
    throw redirect({
      to: ROUTES.participant.login,
      search: { from: encodeRedirectUri(location) },
    })
  }
  if (session.user.accountType !== "PARTICIPANT" || !session.user.mustSetPassword) {
    throw redirect({ to: ROUTES.participant.applications })
  }
}
