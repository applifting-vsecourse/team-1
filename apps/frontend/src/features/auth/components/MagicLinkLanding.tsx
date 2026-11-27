import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Unlink, WifiOff } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import VerificationDot from "@/assets/motion/verification-dot.svg?react"
import VerificationEnd from "@/assets/motion/verification-end.svg?react"
import VerificationStart from "@/assets/motion/verification-start.svg?react"
import { Seo } from "@/components/atoms/Seo"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"

import { LinkSent } from "@/features/auth/components/LinkSent"
import { RequestMagicLinkForm } from "@/features/auth/components/RequestMagicLinkForm"
import { StatusIcon } from "@/features/auth/components/StatusIcon"
import { magicLinkVerifyUrl } from "@/features/auth/lib/magic-link-url"

type MagicLinkLandingProps = {
  /** From the e-mail link. */
  token?: string
  /** Set by the server when the link was refused (spent, expired, unknown). */
  error?: string
}

/**
 * Where the link in the e-mail lands. The token is spent only by the click on „Přihlásit se“ —
 * never by merely opening the page. A link that no longer works (spent, expired, missing) asks
 * for a new one right in the card.
 */
// Figma (Design system v2): #157 / Vstup odkazem z e-mailu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20162-2029 (mobil 20162-2056)
// Figma (Design system v2): US-01 / Odkaz nefunguje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-90 (mobil 15315-123)
export function MagicLinkLanding({ token, error }: MagicLinkLandingProps) {
  const { t } = useTranslation(["auth", "common"])
  const [phase, setPhase] = useState<"ready" | "checking" | "interrupted">("ready")
  const [sentTo, setSentTo] = useState<string | null>(null)
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

  if (!canContinue) {
    return (
      <>
        <Seo title={t("magicLink.invalidTitle")} />
        <AuthLayout>
          {sentTo ? (
            <LinkSent
              email={sentTo}
              back={
                <Link
                  to={ROUTES.participant.login}
                  className="text-link underline"
                >
                  {t("linkSent.back")}
                </Link>
              }
            />
          ) : (
            <>
              <StatusIcon
                icon={Unlink}
                tone="error"
              />
              <h1 className="text-2xl font-bold">{t("magicLink.invalidTitle")}</h1>
              <RequestMagicLinkForm
                submitLabel={t("magicLink.sendNew")}
                onSent={setSentTo}
              />
            </>
          )}
        </AuthLayout>
      </>
    )
  }

  // Figma v2: Interrupted verification · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22516-2497 (mobil 22516-2566)
  if (phase === "interrupted") {
    return (
      <>
        <Seo title={t("magicLink.interruptedTitle")} />
        <AuthLayout>
          <StatusIcon
            icon={WifiOff}
            tone="muted"
          />
          <h1 className="text-2xl font-bold">{t("magicLink.interruptedTitle")}</h1>
          <p className="text-muted-foreground">{t("magicLink.checkConnection")}</p>
          <Button
            size="lg"
            onClick={verify}
          >
            {t("state.retry", { ns: "common" })}
          </Button>
        </AuthLayout>
      </>
    )
  }

  // Figma (Design system v2): #157 / Ověřování odkazu, Motion M01 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20162-2107 (mobil 20162-2127)
  if (phase === "checking") {
    return (
      <>
        <Seo title={t("magicLink.verifying")} />
        <AuthLayout>
          <div
            role="status"
            className="flex flex-col items-center gap-3 py-2"
          >
            <span
              aria-hidden="true"
              className="verifying-mark relative size-14"
            >
              <VerificationStart className="absolute top-[15.5%] left-[15.5%]" />
              <VerificationEnd className="absolute right-[15.5%] bottom-[15.5%]" />
              <VerificationDot className="absolute top-[44%] left-[44%]" />
            </span>
            <h1 className="text-sm font-medium">{t("magicLink.verifying")}</h1>
          </div>
        </AuthLayout>
      </>
    )
  }

  return (
    <>
      <Seo title={t("magicLink.title")} />
      <AuthLayout>
        <h1 className="text-2xl font-bold">{t("magicLink.title")}</h1>
        <Button
          size="lg"
          onClick={verify}
        >
          {t("form.submit")}
        </Button>
      </AuthLayout>
    </>
  )
}
