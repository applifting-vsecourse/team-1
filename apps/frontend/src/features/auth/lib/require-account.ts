import type { QueryClient } from "@tanstack/react-query"
import { redirect, type ParsedLocation } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ForbiddenError } from "@/lib/errors"

import {
  authSessionQueryOptions,
  type AccountType,
} from "@/features/auth/api/authSessionQueryOptions"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

type RequireAccountOptions = {
  queryClient: QueryClient
  location: ParsedLocation
  /** Where to send a signed-out visitor; they come back here after signing in. */
  loginRoute: typeof ROUTES.organizer.login | typeof ROUTES.participant.login
  accountType: AccountType
}

/**
 * `beforeLoad` guard for the signed-in areas. Runs before any child loader.
 * - signed out → login page (and back afterwards),
 * - participant who has not chosen a password yet → set-password page (US-04),
 * - wrong account type → `ForbiddenError`; the layout's `errorComponent`
 *   renders the 403 page and no data of the area is requested (US-02).
 */
export async function requireAccount({
  queryClient,
  location,
  loginRoute,
  accountType,
}: RequireAccountOptions) {
  const session = await queryClient.ensureQueryData(authSessionQueryOptions())

  if (!session) {
    queryClient.clear()
    throw redirect({
      to: loginRoute,
      search: { from: encodeRedirectUri(location) },
    })
  }

  if (session.user.accountType === "PARTICIPANT" && session.user.mustSetPassword) {
    throw redirect({ to: ROUTES.participant.setPassword })
  }

  if (session.user.accountType !== accountType) throw new ForbiddenError()

  return { session }
}
