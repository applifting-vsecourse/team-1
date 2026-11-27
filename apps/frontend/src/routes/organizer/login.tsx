import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { CardFooterLinks } from "@/features/auth/components/CardFooterLinks"
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

// US-02 (S01, S13) sign-in; US-69 adds public organizer registration.
// Figma (Design system v2): Přihlášení organizátora · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27462-8620 (mobile 27462-8692)
function OrganizerLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("organizerLogin.title")} />
      <AuthLayout>
        <h1 className="text-center text-2xl font-bold">{t("organizerLogin.title")}</h1>
        <SignInWithRedirect
          from={from}
          accountType="ORGANIZER"
          fallback={ROUTES.organizer.home}
        />
        <CardFooterLinks
          links={[
            { to: ROUTES.organizer.register, label: t("organizerLogin.createAccount") },
            { to: ROUTES.participant.login, label: t("organizerLogin.participantLink") },
          ]}
        />
      </AuthLayout>
    </>
  )
}
