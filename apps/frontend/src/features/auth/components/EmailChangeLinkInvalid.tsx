import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { Header } from "@/components/organisms/Header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
      <Header
        userMenu={
          <Button
            asChild
            variant="ghost"
          >
            <Link to={ROUTES.home}>{t("emailChangeInvalid.signIn")}</Link>
          </Button>
        }
      />
      <main className="min-h-svh">
        <div className="w-full max-w-160 px-4 py-8 md:p-12">
          <Card className="gap-4 rounded-xl border-0 p-4 shadow-none">
            <h1 className="text-2xl font-bold">{t("emailChangeInvalid.title")}</h1>
            <Alert
              variant="destructive"
              className="rounded-lg border-destructive bg-card p-4 *:data-[slot=alert-description]:text-muted-foreground"
            >
              <TriangleAlert />
              <AlertTitle>{t("emailChangeInvalid.alertTitle")}</AlertTitle>
              <AlertDescription>{t("emailChangeInvalid.alertBody")}</AlertDescription>
            </Alert>
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-lg"
            >
              <Link to={ROUTES.home}>{t("emailChangeInvalid.action")}</Link>
            </Button>
          </Card>
        </div>
      </main>
    </>
  )
}
