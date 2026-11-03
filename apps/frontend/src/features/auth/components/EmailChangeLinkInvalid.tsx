import { Link } from "@tanstack/react-router"
import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * Where a verification link that no longer works (used, expired, unknown) ends.
 * The account keeps its e-mail; the way on is to sign in and start the change again.
 */
// Figma (Design system): US-125 / Ověření změny e-mailu · Neplatný ověřovací odkaz · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-3490 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-3519 (mobil)
export function EmailChangeLinkInvalid() {
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("emailChangeInvalid.title")} />
      <AuthLayout
        title={t("emailChangeInvalid.title")}
        description={t("emailChangeInvalid.description")}
      >
        <Alert
          variant="destructive"
          className="border-destructive/30 bg-destructive/10"
        >
          <CircleAlert />
          <AlertTitle>{t("emailChangeInvalid.alertTitle")}</AlertTitle>
          <AlertDescription className="text-destructive/90">
            {t("emailChangeInvalid.alertBody")}
          </AlertDescription>
        </Alert>
        <Button
          asChild
          size="lg"
          className="w-full"
        >
          <Link to={ROUTES.home}>{t("emailChangeInvalid.action")}</Link>
        </Button>
      </AuthLayout>
    </>
  )
}
