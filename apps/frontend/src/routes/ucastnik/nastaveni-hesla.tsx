import { createFileRoute } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { requireSession } from "@/features/auth/lib/require-session"

export const Route = createFileRoute("/ucastnik/nastaveni-hesla")({
  loader: async ({ context, location }) => {
    await requireSession({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.participant.login,
    })
  },
  component: SetPasswordPage,
})

// Skeleton — US-04 (S09). Mandatory after the first sign-in via magic link.
function SetPasswordPage() {
  return (
    <>
      <Seo title="Nastavení hesla" />
      <AuthLayout
        title="Nastavení hesla"
        description="Připravuje se — US-04."
      >
        {null}
      </AuthLayout>
    </>
  )
}
