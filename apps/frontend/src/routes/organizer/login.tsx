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
function OrganizerLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("organizerLogin.title")} />
      <AuthLayout
        title={t("organizerLogin.title")}
        back={<BackLink to={ROUTES.home}>{t("backHome")}</BackLink>}
        description={t("organizerLogin.description")}
        cardTitle={t("organizerLogin.cardTitle")}
        footer={
          <div className="flex flex-col gap-4">
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="h-12 w-full"
            >
              <Link to={ROUTES.organizer.register}>{t("organizerLogin.createAccount")}</Link>
            </Button>
            <div className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
              {t("organizerLogin.participantHint")}
              <Link
                to={ROUTES.participant.login}
                className="font-medium text-accent-foreground underline underline-offset-4"
              >
                {t("organizerLogin.participantLink")}
              </Link>
            </div>
          </div>
        }
      >
        <SignInWithRedirect
          from={from}
          accountType="ORGANIZER"
          fallback={ROUTES.organizer.home}
          emailHint={t("organizerLogin.emailHint")}
        />
      </AuthLayout>
    </>
  )
}
