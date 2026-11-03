import type { QueryClient } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"

/**
 * `beforeLoad` of the page the e-mail link ends on. A link that worked leads on to
 * the account settings of the signed-in account (the server has applied the change
 * and signed the browser in); a failed one (`?error=`) stays and shows what to do.
 */
export async function leaveEmailChangeLanding(queryClient: QueryClient, error?: string) {
  if (error) return
  // The session still holds the old e-mail: read it fresh.
  const session = await queryClient
    .fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
    .catch(() => null)
  if (!session) return

  switch (session.user.accountType) {
    case "ORGANIZER":
      throw redirect({ to: ROUTES.organizer.account, search: { emailChanged: true } })
    case "PARTICIPANT":
      throw redirect({ to: ROUTES.participant.account, search: { emailChanged: true } })
    case "ADMIN":
      throw redirect({ to: ROUTES.home })
  }
}
