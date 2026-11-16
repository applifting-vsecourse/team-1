import { createFileRoute } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import { OrganizationOnboarding } from "@/features/auth/components/OrganizationOnboarding"
import { requireAccount } from "@/features/auth/lib/require-account"

export const Route = createFileRoute("/organizer/onboarding")({
  beforeLoad: async ({ context, location }) => {
    await requireAccount({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.organizer.login,
      accountType: "ORGANIZER",
    })
  },
  component: OrganizationOnboarding,
})
