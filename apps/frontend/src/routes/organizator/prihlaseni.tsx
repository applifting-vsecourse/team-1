import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignInWithRedirect } from "@/features/auth/components/SignInWithRedirect"

const searchSchema = z.object({
  from: z.string().optional(),
})

export const Route = createFileRoute("/organizator/prihlaseni")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.organizer.dashboard })
  },
  component: OrganizerLoginPage,
})

// US-02 (S01). Organizer accounts come from the seed in sprint 1 — no sign-up.
function OrganizerLoginPage() {
  const { from } = Route.useSearch()

  return (
    <>
      <Seo title="Přihlášení organizátora" />
      <AuthLayout
        title="Přihlášení organizátora"
        description="Správa akcí, přihlášek a plateb."
      >
        <SignInWithRedirect
          from={from}
          fallback={ROUTES.organizer.dashboard}
        />
      </AuthLayout>
    </>
  )
}
