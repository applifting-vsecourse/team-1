import { useEffect, useState } from "react"
import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { HeadingBand } from "@/components/atoms/HeadingBand"
import { LogoSymbol } from "@/components/atoms/Logo"
import { Seo } from "@/components/atoms/Seo"
import { Header } from "@/components/organisms/Header"
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
  const [isVerifying, setIsVerifying] = useState(false)
  useEffect(() => {
    // Returning from the verification endpoint may restore the page from the browser cache.
    const restore = () => setIsVerifying(false)
    window.addEventListener("pageshow", restore)
    return () => window.removeEventListener("pageshow", restore)
  }, [])
  const canContinue = Boolean(token) && !error
  // A link that cannot be used must not promise "Open your application".
  const title = t(canContinue ? "magicLink.title" : "magicLink.requestTitle")

  // Figma: US-01 waiting for the verification response, Motion M01.
  // Desktop https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-213
  // Mobile https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-236
  if (canContinue && isVerifying) {
    return (
      <div className="flex min-h-svh flex-col">
        <Seo title={t("magicLink.verifying")} />
        <Header />
        <main className="grid flex-1 place-items-center px-6 py-8 md:py-12">
          <Card className="w-full max-w-160 rounded-2xl p-8 [--workspace-inset:0px]">
            <HeadingBand>
              <div
                role="status"
                className="flex flex-col items-center gap-4 text-center"
              >
                <LogoSymbol className="verifying-mark size-12 text-primary" />
                <p className="text-sm text-muted-foreground">{t("magicLink.checkingAccess")}</p>
                <h1 className="text-2xl font-bold">{t("magicLink.verifying")}</h1>
              </div>
            </HeadingBand>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <>
      <Seo title={title} />
      <AuthLayout
        hasBand
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
                onClick={() => {
                  setIsVerifying(true)
                  window.location.assign(magicLinkVerifyUrl(token, window.location.origin))
                }}
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
