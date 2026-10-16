import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
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

// Skeleton — US-04 (S09). Mandatory after the first sign-in via magic link.
function SetPasswordPage() {
  const { t } = useTranslation(["auth", "common"])

  return (
    <>
      <Seo title={t("setPassword.title")} />
      <AuthLayout
        title={t("setPassword.title")}
        description={t("common:comingSoon", { story: "US-04" })}
      >
        {null}
      </AuthLayout>
    </>
  )
}
