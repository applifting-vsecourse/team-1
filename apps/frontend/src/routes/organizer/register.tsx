import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { OrganizerRegistration } from "@/features/auth/components/OrganizerRegistration"

export const Route = createFileRoute("/organizer/register")({
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (session?.user.accountType === "ORGANIZER") {
      throw redirect({ to: ROUTES.organizer.onboarding })
    }
  },
  component: OrganizerRegistration,
})
