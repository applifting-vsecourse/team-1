import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { BackLink } from "@/components/molecules/BackLink"
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

// US-02 (S10). Participant accounts come from a submitted application (US-01);
// Figma v2 · participant sign-in · desktop 15315:2 and mobile 15315:52.
// The recovery action opens the existing public magic-link request.
function ParticipantLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("participantLogin.title")} />
      <AuthLayout
        isSingleCard
        title={t("participantLogin.title")}
        back={<BackLink to={ROUTES.home}>{t("backHome")}</BackLink>}
        description={t("participantLogin.description")}
      >
        <SignInWithRedirect
          from={from}
          accountType="PARTICIPANT"
          fallback={ROUTES.participant.applications}
          emailHint={t("participantLogin.emailHint")}
          passwordHint={t("participantLogin.passwordHint")}
        />
        <div className="flex flex-col items-start gap-1 border-t pt-4">
          <p>{t("requestLink.cardTitle")}</p>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="px-0"
          >
            <Link to={ROUTES.participant.magicLink}>{t("participantLogin.requestLink")}</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3">
          <p className="text-muted-foreground">{t("participantLogin.otherAccount")}</p>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="px-0"
          >
            <Link to={ROUTES.organizer.login}>{t("organizerLogin.title")}</Link>
          </Button>
        </div>
      </AuthLayout>
    </>
  )
}
