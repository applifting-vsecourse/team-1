import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignInWithRedirect } from "@/features/auth/components/SignInWithRedirect"
import { accountHome } from "@/features/auth/lib/account-home"

const searchSchema = z.object({
  from: z.string().optional(),
})

export const Route = createFileRoute("/ucastnik/prihlaseni")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: accountHome(session.user) })
  },
  component: ParticipantLoginPage,
})

// US-02 (S10). Participant accounts come from a submitted application (US-01);
// "send me a new link" (magic link) is added in stream C.
function ParticipantLoginPage() {
  const { from } = Route.useSearch()

  return (
    <>
      <Seo title="Přihlášení účastníka" />
      <AuthLayout
        title="Přihlášení účastníka"
        description="Stav vaší přihlášky a platební údaje."
      >
        <SignInWithRedirect
          from={from}
          fallback={ROUTES.participant.applications}
        />
      </AuthLayout>
    </>
  )
}
