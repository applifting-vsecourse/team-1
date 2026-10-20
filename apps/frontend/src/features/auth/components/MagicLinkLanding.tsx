import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { RequestMagicLinkForm } from "@/features/auth/components/RequestMagicLinkForm"
import { magicLinkVerifyUrl } from "@/features/auth/lib/magic-link-url"

type MagicLinkLandingProps = {
  /** From the e-mail link. */
  token?: string
  /** Set by the server when the link was refused (spent, expired, unknown). */
  error?: string
}

/**
 * Where the link in the e-mail lands. The token is spent only by the click on
 * "Continue" — never by merely opening the page. A link that no longer works
 * leads straight to asking for a new one.
 */
// Figma (Design system): S18 Vstup odkazem z e-mailu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13183-22903
// Figma (Design system): S15 Neplatný přihlašovací odkaz · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13183-22953
export function MagicLinkLanding({ token, error }: MagicLinkLandingProps) {
  const { t } = useTranslation("auth")
  const canContinue = Boolean(token) && !error
  // A link that cannot be used must not promise "Open your application".
  const title = t(canContinue ? "magicLink.title" : "magicLink.requestTitle")

  return (
    <>
      <Seo title={title} />
      <AuthLayout
        title={title}
        description={t(canContinue ? "magicLink.description" : "magicLink.requestDescription")}
      >
        {canContinue && token ? (
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">{t("magicLink.cardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              <p>{t("magicLink.body")}</p>
              <Button
                size="lg"
                onClick={() =>
                  window.location.assign(magicLinkVerifyUrl(token, window.location.origin))
                }
              >
                {t("magicLink.continue")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {error ? (
              <Alert
                variant="destructive"
                className="border-destructive/30 bg-destructive/10"
              >
                <CircleAlert />
                <AlertTitle>{t("magicLink.invalidTitle")}</AlertTitle>
                <AlertDescription className="text-destructive/90">
                  {t("magicLink.invalidBody")}
                </AlertDescription>
              </Alert>
            ) : null}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-lg tracking-tight">
                  {t("requestLink.cardTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p>{t("requestLink.body")}</p>
                <RequestMagicLinkForm />
              </CardContent>
            </Card>
          </>
        )}
      </AuthLayout>
    </>
  )
}
