import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Card } from "@/components/ui/card"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { RequestMagicLinkForm } from "@/features/auth/components/RequestMagicLinkForm"
import { SignInWithRedirect } from "@/features/auth/components/SignInWithRedirect"
import { accountHome } from "@/features/auth/lib/account-home"

const searchSchema = z.object({
  from: z.string().optional(),
})

export const Route = createFileRoute("/participant/login")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: accountHome(session.user) })
  },
  component: ParticipantLoginPage,
})

// US-02 (S10). Participant accounts come from a submitted application (US-01);
// whoever has no password yet (or lost the link) asks for a new link in the second card.
function ParticipantLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("participantLogin.title")} />
      <AuthLayout
        title={t("participantLogin.title")}
        description={t("participantLogin.description")}
      >
        <Card className="gap-5 p-6">
          <h2 className="text-lg font-semibold">{t("participantLogin.cardTitle")}</h2>
          <SignInWithRedirect
            from={from}
            accountType="PARTICIPANT"
            fallback={ROUTES.participant.applications}
            emailHint={t("participantLogin.emailHint")}
            passwordHint={t("participantLogin.passwordHint")}
          />
        </Card>
        <Card className="gap-5 p-6">
          <h2 className="text-lg font-semibold">{t("requestLink.cardTitle")}</h2>
          <p className="text-sm">{t("requestLink.body")}</p>
          <RequestMagicLinkForm />
        </Card>
      </AuthLayout>
    </>
  )
}
