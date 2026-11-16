import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { VerifyOrganizerEmail } from "@/features/auth/components/VerifyOrganizerEmail"

export const Route = createFileRoute("/organizer/verify-email")({
  validateSearch: z.object({ email: z.string().default(""), error: z.string().optional() }),
  loader: async ({ context }) => {
    const session = await context.queryClient.fetchQuery({
      ...authSessionQueryOptions(),
      staleTime: 0,
    })
    if (session?.user.accountType === "ORGANIZER") {
      throw redirect({ to: ROUTES.organizer.onboarding })
    }
  },
  component: VerifyPage,
})

function VerifyPage() {
  const { email, error } = Route.useSearch()
  return (
    <VerifyOrganizerEmail
      email={email}
      error={error}
    />
  )
}
