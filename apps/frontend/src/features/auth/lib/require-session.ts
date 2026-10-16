import type { QueryClient } from "@tanstack/react-query"
import { redirect, type ParsedLocation } from "@tanstack/react-router"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

type RequireSessionOptions = {
  queryClient: QueryClient
  location: ParsedLocation
  /** Where to send a signed-out visitor; they come back here after signing in. */
  loginRoute: "/organizator/prihlaseni" | "/ucastnik/prihlaseni"
}

/** Route-loader guard for the signed-in areas. Returns the session. */
export async function requireSession({ queryClient, location, loginRoute }: RequireSessionOptions) {
  const session = await queryClient.ensureQueryData(authSessionQueryOptions())
  if (session) return session

  queryClient.clear()
  throw redirect({
    to: loginRoute,
    search: { from: encodeRedirectUri(location) },
  })
}
