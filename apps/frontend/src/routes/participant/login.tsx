import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
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

// US-02 (S10). Participant accounts come from a submitted application (US-01).
// Figma (Design system v2): US-02 / Přihlášení přihlašovatele · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-2 (mobil 15315-52, chybné údaje 18571-1482)
// The recovery action opens the existing public magic-link request.
function ParticipantLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("participantLogin.title")} />
      <AuthLayout
        isSingleCard
        showDivider={false}
        title={t("participantLogin.title")}
        description={t("participantLogin.description")}
      >
        <SignInWithRedirect
          from={from}
          accountType="PARTICIPANT"
          fallback={ROUTES.participant.applications}
        />
        <div className="flex flex-col items-start gap-1">
          <p>{t("participantLogin.noPassword")}</p>
          <Button
            asChild
            variant="ghost"
            size="lg"
          >
            <Link to={ROUTES.participant.magicLink}>{t("participantLogin.requestLink")}</Link>
          </Button>
        </div>
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">{t("participantLogin.otherAccount")}</p>
          <Button
            asChild
            variant="ghost"
            size="lg"
          >
            <Link to={ROUTES.organizer.login}>{t("organizerLogin.title")}</Link>
          </Button>
        </div>
      </AuthLayout>
    </>
  )
}
