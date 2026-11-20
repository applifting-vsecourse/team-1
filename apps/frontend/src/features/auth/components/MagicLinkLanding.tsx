import { useEffect, useState } from "react"
import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import VerificationDot from "@/assets/motion/verification-dot.svg?react"
import VerificationEnd from "@/assets/motion/verification-end.svg?react"
import VerificationStart from "@/assets/motion/verification-start.svg?react"
import { HeadingBand } from "@/components/atoms/HeadingBand"
import { Seo } from "@/components/atoms/Seo"
import { AccessCardLayout } from "@/components/templates/AccessCardLayout"
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
// Figma (Design system v2): #157 / Vstup odkazem z e-mailu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20162-2029 (mobil 20162-2056)
// Figma (Design system v2): US-01 / Odkaz vypršel · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-90 (mobil 15315-123)
export function MagicLinkLanding({ token, error }: MagicLinkLandingProps) {
  const { t } = useTranslation(["auth", "common"])
  const [phase, setPhase] = useState<"ready" | "checking" | "interrupted">("ready")
  const verify = () => {
    if (!token) return
    if (!navigator.onLine) {
      setPhase("interrupted")
      return
    }
    setPhase("checking")
    window.location.assign(magicLinkVerifyUrl(token, window.location.origin))
  }
  useEffect(() => {
    // Returning from the verification endpoint may restore the page from the browser cache.
    const restore = () => setPhase("ready")
    const interrupt = () =>
      setPhase((previous) => (previous === "checking" ? "interrupted" : previous))
    window.addEventListener("offline", interrupt)
    window.addEventListener("pageshow", restore)
    return () => {
      window.removeEventListener("pageshow", restore)
      window.removeEventListener("offline", interrupt)
    }
  }, [])
  const canContinue = Boolean(token) && !error
  // A link that cannot be used must not promise "Open your application".
  const title = t(canContinue ? "magicLink.title" : "magicLink.requestTitle")

  // Figma (Design system v2): #157 / Ověřování odkazu, Motion M01 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20162-2107 (mobil 20162-2127)
  // Figma v2: Interrupted verification, CZ/EN and both widths · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22516-2497
  if (canContinue && phase === "interrupted") {
    return (
      <AccessCardLayout title={t("magicLink.interruptedTitle")}>
        <HeadingBand>
          <h1 className="text-2xl font-bold">{t("magicLink.interruptedTitle")}</h1>
          <p>{t("magicLink.checkConnection")}</p>
        </HeadingBand>
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{t("magicLink.interrupted")}</AlertTitle>
          <AlertDescription>{t("magicLink.interruptedHelp")}</AlertDescription>
        </Alert>
        <Button
          size="lg"
          onClick={verify}
        >
          {t("state.retry", { ns: "common" })}
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
        >
          <a href={ROUTES.participant.magicLink}>{t("magicLink.requestAnother")}</a>
        </Button>
      </AccessCardLayout>
    )
  }
  if (canContinue && phase === "checking") {
    return (
      <AccessCardLayout title={t("magicLink.verifying")}>
        <HeadingBand>
          <div
            role="status"
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="flex w-50 max-w-full flex-col items-center gap-3 self-start p-4">
              <span
                aria-hidden="true"
                className="verifying-mark relative size-14"
              >
                <VerificationStart className="absolute top-[15.5%] left-[15.5%]" />
                <VerificationEnd className="absolute right-[15.5%] bottom-[15.5%]" />
                <VerificationDot className="absolute top-[44%] left-[44%]" />
              </span>
              <p className="text-sm font-medium">{t("magicLink.checkingAccess")}</p>
            </div>
            <h1 className="text-2xl font-bold">{t("magicLink.verifying")}</h1>
            <p>{t("magicLink.verifyingDescription")}</p>
          </div>
        </HeadingBand>
      </AccessCardLayout>
    )
  }

  if (canContinue && token) {
    return (
      <AccessCardLayout title={title}>
        <HeadingBand>
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{t("magicLink.description")}</p>
            <h2 className="font-semibold">{t("magicLink.cardTitle")}</h2>
            <p>{t("magicLink.body")}</p>
          </div>
        </HeadingBand>
        <Button
          size="lg"
          onClick={verify}
        >
          {t("magicLink.continue")}
        </Button>
      </AccessCardLayout>
    )
  }

  return (
    <>
      <Seo title={title} />
      <AuthLayout
        hasBand
        title={title}
        description={t("magicLink.requestDescription")}
      >
        {error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{t("magicLink.invalidTitle")}</AlertTitle>
            <AlertDescription>{t("magicLink.invalidBody")}</AlertDescription>
          </Alert>
        ) : null}
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">{t("requestLink.cardTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>{t("requestLink.body")}</p>
            <RequestMagicLinkForm />
          </CardContent>
        </Card>
      </AuthLayout>
    </>
  )
}
