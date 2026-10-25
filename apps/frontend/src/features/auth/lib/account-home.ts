import { ROUTES } from "@/app/routes"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"

/** Where a signed-in user belongs. The admin has no UI in sprint 1. */
export function accountHome(user: SessionUser) {
  switch (user.accountType) {
    case "ORGANIZER":
      return ROUTES.organizer.events
    case "PARTICIPANT":
      return user.mustSetPassword ? ROUTES.participant.setPassword : ROUTES.participant.applications
    case "ADMIN":
      return ROUTES.home
  }
}
