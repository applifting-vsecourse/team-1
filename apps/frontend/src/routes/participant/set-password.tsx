import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { HeadingBand } from "@/components/atoms/HeadingBand"
import { AccessCardLayout } from "@/components/templates/AccessCardLayout"

import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm"
import { useSession } from "@/features/auth/hooks/useSession"
import { guardSetPassword } from "@/features/auth/lib/guard-set-password"

export const Route = createFileRoute("/participant/set-password")({
  loader: ({ context, location }) => guardSetPassword(context.queryClient, location),
  component: SetPasswordPage,
})

// US-04 (S09). Mandatory after the first sign-in via magic link.
// Figma (Design system v2): US-04 / První nastavení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15316-10038 (mobil 15316-10075)
function SetPasswordPage() {
  const { t } = useTranslation("auth")
  const { user } = useSession()

  return (
    <AccessCardLayout
      title={t("setPassword.title")}
      className="max-w-140 p-6 md:p-8"
    >
      <HeadingBand>
        <h1 className="text-2xl font-bold">{t("setPassword.title")}</h1>
        <p className="mt-4">{t("setPassword.description")}</p>
      </HeadingBand>
      <SetPasswordForm email={user?.email ?? ""} />
      <p className="text-sm">{t("setPassword.footer")}</p>
    </AccessCardLayout>
  )
}
