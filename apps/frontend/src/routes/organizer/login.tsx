import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
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

export const Route = createFileRoute("/organizer/login")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: accountHome(session.user) })
  },
  component: OrganizerLoginPage,
})

// US-02 (S01). Organizer accounts come from the seed in sprint 1 — no sign-up.
function OrganizerLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("organizerLogin.title")} />
      <AuthLayout
        title={t("organizerLogin.title")}
        description={t("organizerLogin.description")}
      >
        <SignInWithRedirect
          from={from}
          fallback={ROUTES.organizer.dashboard}
        />
      </AuthLayout>
    </>
  )
}
