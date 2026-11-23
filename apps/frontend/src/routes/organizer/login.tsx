import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
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
// Figma v2: Přihlášení organizátora · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22456-10814
function OrganizerLoginPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("organizerLogin.title")} />
      <AuthLayout
        title={t("organizerLogin.title")}
        description={t("organizerLogin.description")}
        isSingleCard
        showDivider={false}
        footer={
          <div className="flex flex-col gap-4 border-t pt-4">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link to={ROUTES.organizer.register}>{t("organizerLogin.createAccount")}</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="w-full border border-primary/30 text-primary"
            >
              <Link to={ROUTES.participant.login}>
                {t("organizerLogin.participantLink")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        }
      >
        <SignInWithRedirect
          from={from}
          accountType="ORGANIZER"
          fallback={ROUTES.organizer.home}
        />
      </AuthLayout>
    </>
  )
}
