import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Only environments without working e-mails switch the bypass on (EMAIL_VERIFICATION_BYPASS_ENABLED).
  const { data: canBypass } = useQuery({
    queryKey: ["auth", "email-verification-bypass"],
    queryFn: async () => {
      const { data } = await authClient.$fetch<{ enabled: boolean }>(
        "/email-verification-bypass/status",
      )
      return Boolean(data?.enabled)
    },
    staleTime: Infinity,
    retry: false,
  })
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

  const verifyWithoutEmail = async () => {
    if (!email) return
    setPending(true)
    setFailure(null)
    try {
      const { error: bypassError } = await authClient.$fetch("/email-verification-bypass", {
        method: "POST",
        body: { email },
      })
      if (bypassError) {
        setFailure(
          bypassError.status === 429
            ? tErrors("TOO_MANY_REQUESTS")
            : t("registration.verifyBypassFailed"),
        )
        return
      }
      // Load the new session now: the guards of the next page would trust a cached "signed out".
      await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      await navigate({ to: ROUTES.organizer.onboarding })
    } catch {
      setFailure(t("registration.verifyBypassFailed"))
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
      {canBypass ? (
        <Button
          size="lg"
          variant="outline"
          disabled={isPending || !email}
          onClick={() => void verifyWithoutEmail()}
          className="h-12 w-full"
        >
          {t("registration.verifyBypass")}
        </Button>
      ) : null}
    </RegistrationLayout>
  )
}
