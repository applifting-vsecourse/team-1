import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"
import { authClient } from "@/features/auth/lib/auth-client"

type Props = { email: string; error?: string }

// Figma (Design system): #69 / Ověřte svůj e-mail / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23125
// Figma (Design system): #69 / Ověřovací odkaz vypršel / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23779
export function VerifyOrganizerEmail({ email, error }: Props) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const isExpired = Boolean(error)
  const title = t(isExpired ? "registration.expiredTitle" : "registration.verifyTitle")

  const resend = async () => {
    if (!email) return
    setPending(true)
    setFailure(null)
    try {
      const callbackURL = `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(email)}`
      const { error: sendError } = await authClient.sendVerificationEmail({ email, callbackURL })
      if (sendError) {
        setFailure(
          sendError.status === 429 ? tErrors("TOO_MANY_REQUESTS") : t("registration.resendFailed"),
        )
      }
    } catch {
      setFailure(t("registration.resendFailed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <RegistrationLayout>
      <Seo title={title} />
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {isExpired ? (
        <Alert
          variant="destructive"
          className="border-destructive bg-card"
        >
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{t("registration.expiredAlertTitle")}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {t("registration.expiredAlertDescription")}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <p>{t("registration.verifySent", { email })}</p>
          <p>{t("registration.verifyDescription")}</p>
          <p>{t("registration.verifyRestriction")}</p>
        </>
      )}
      {failure ? (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        size="lg"
        disabled={isPending || !email}
        onClick={() => void resend()}
        className="h-12 w-full"
      >
        {t(isExpired ? "registration.expiredAction" : "registration.resend")}
      </Button>
    </RegistrationLayout>
  )
}
