import { Link } from "@tanstack/react-router"
import { Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"

import { StatusIcon } from "@/features/auth/components/StatusIcon"
import { useSession } from "@/features/auth/hooks/useSession"

/**
 * Where a verification link that no longer works (used, expired, unknown) ends. The account keeps
 * its e-mail; the way on is the account settings, where the change starts again. Signed out, the
 * settings ask for the sign-in first (participants; an organizer switches on the sign-in card).
 */
// Figma (Design system v2): Změna e-mailu · odkaz nefunguje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27460-7173 (mobil 27460-7218)
export function EmailChangeLinkInvalid() {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const account =
    user?.accountType === "ORGANIZER" ? ROUTES.organizer.account : ROUTES.participant.account

  return (
    <>
      <Seo title={t("emailChangeInvalid.title")} />
      <AuthLayout>
        <StatusIcon
          icon={Unlink}
          tone="error"
        />
        <h1 className="text-center text-2xl font-bold">{t("emailChangeInvalid.title")}</h1>
        <Button
          asChild
          size="lg"
          className="w-full"
        >
          <Link to={account}>{t("emailChangeInvalid.action")}</Link>
        </Button>
      </AuthLayout>
    </>
  )
}
