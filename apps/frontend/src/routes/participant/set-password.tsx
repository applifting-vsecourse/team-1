import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"

import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm"
import { useSession } from "@/features/auth/hooks/useSession"
import { guardSetPassword } from "@/features/auth/lib/guard-set-password"

export const Route = createFileRoute("/participant/set-password")({
  loader: ({ context, location }) => guardSetPassword(context.queryClient, location),
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
