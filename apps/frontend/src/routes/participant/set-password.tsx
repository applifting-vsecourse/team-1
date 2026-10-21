import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

export const Route = createFileRoute("/participant/set-password")({
  loader: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) {
      throw redirect({
        to: ROUTES.participant.login,
        search: { from: encodeRedirectUri(location) },
      })
    }
    // Only a participant still without a password belongs here.
    if (session.user.accountType !== "PARTICIPANT" || !session.user.mustSetPassword) {
      throw redirect({ to: ROUTES.participant.applications })
    }
  },
  component: SetPasswordPage,
})

// US-04 (S09). Mandatory after the first sign-in via magic link.
// Figma (Design system): S09 První přístup a nové heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-221
function SetPasswordPage() {
  const { t } = useTranslation("auth")
  const { user } = useSession()

  return (
    <>
      <Seo title={t("setPassword.title")} />
      <AuthLayout
        title={t("setPassword.title")}
        description={t("setPassword.description")}
        cardTitle={t("setPassword.cardTitle")}
        footer={t("setPassword.footer")}
      >
        <SetPasswordForm email={user?.email ?? ""} />
      </AuthLayout>
    </>
  )
}
