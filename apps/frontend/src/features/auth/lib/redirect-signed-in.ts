import type { QueryClient } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { accountHome } from "@/features/auth/lib/account-home"

/**
 * Loader for the landing: it is for signed-out visitors, so a signed-in user
 * (e.g. clicking the logo) goes back to their area. A failed session request
 * must not take the public page down — it counts as signed out.
 */
export async function redirectSignedIn(queryClient: QueryClient) {
  const session = await queryClient.ensureQueryData(authSessionQueryOptions()).catch(() => null)
  if (!session) return
  const home = accountHome(session.user)
  if (home !== ROUTES.home) throw redirect({ to: home })
}
