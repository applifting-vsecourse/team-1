import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { Seo } from "@/components/atoms/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiErrorCode } from "@/lib/api-client"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import {
  emailVerificationBypassQueryOptions,
  verifyEmailWithoutLink,
} from "@/features/auth/api/emailVerificationBypass"
import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"
import { authClient } from "@/features/auth/lib/auth-client"

type Props = { email: string; error?: string }

// Figma v2: Ověřte svůj e-mail · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22456-11182
// Figma v2: Ověřovací odkaz vypršel · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21238-11168
export function VerifyOrganizerEmail({ email, error }: Props) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const [resentTo, setResentTo] = useState("")
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Only environments without working e-mails switch the bypass on (EMAIL_VERIFICATION_BYPASS_ENABLED).
  const { data: isBypassOn } = useQuery(emailVerificationBypassQueryOptions())
  // The one-time token of this registration travels in the history state, never in the URL.
  const bypassToken = useLocation({
    select: (location) => {
      const parsed = z.object({ bypassToken: z.string() }).safeParse(location.state)
      return parsed.success ? parsed.data.bypassToken : null
    },
  })
  // Without a token (it expired, or the screen was opened directly) the password proves ownership.
  const [isTokenRefused, setTokenRefused] = useState(false)
  const [password, setPassword] = useState("")
  const shouldAskPassword = !bypassToken || isTokenRefused
  const canBypass = Boolean(isBypassOn && email)
  const isResent = Boolean(email) && resentTo === email
  const isExpired = Boolean(error) && !isResent
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
      } else {
        setResentTo(email)
      }
    } catch {
      setFailure(t("registration.resendFailed"))
    } finally {
      setPending(false)
    }
  }

  const verifyWithoutEmail = async () => {
    setPending(true)
    setFailure(null)
    try {
      await verifyEmailWithoutLink(
        bypassToken && !isTokenRefused ? { token: bypassToken } : { email, password },
      )
      // Load the new session now: the guards of the next page would trust a cached "signed out".
      await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      await navigate({ to: ROUTES.organizer.onboarding })
    } catch (bypassError) {
      if (apiErrorCode(bypassError) === "TOO_MANY_REQUESTS") {
        setFailure(tErrors("TOO_MANY_REQUESTS"))
      } else if (apiErrorCode(bypassError) === "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED") {
        // A refused token is spent or expired: from here on only the password works.
        setFailure(
          t(
            shouldAskPassword
              ? "registration.verifyBypassWrongPassword"
              : "registration.verifyBypassExpired",
          ),
        )
        setTokenRefused(true)
      } else {
        setFailure(t("registration.verifyBypassFailed"))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <RegistrationLayout>
      <Seo title={title} />
      <h1 className="text-center text-2xl font-bold tracking-tight">{title}</h1>
      <BrandDivider />
      {isResent && (
        <p
          role="status"
          className="font-medium text-primary"
        >
          {t("registration.resent")}
        </p>
      )}
      {isExpired ? (
        <Alert
          variant="destructive"
          className="border-destructive bg-card"
        >
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{t("registration.expiredAlertTitle")}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {t("registration.expiredAlertDescription", { email })}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {email ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">{t("registration.verifySent")}</p>
              <p className="break-all">{email}</p>
            </div>
          ) : null}
          <p>{t("registration.verifyDescription")}</p>
          <p className="text-muted-foreground">{t("registration.verifyRestriction")}</p>
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
      {isExpired ? null : <p className="text-muted-foreground">{t("registration.checkSpam")}</p>}
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-12 w-full"
      >
        <Link to={ROUTES.organizer.register}>{t("registration.correctEmail")}</Link>
      </Button>
      {isExpired ? null : (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 w-full"
        >
          <Link to={ROUTES.organizer.login}>{t("registration.signIn")}</Link>
        </Button>
      )}
      {canBypass ? (
        <section className="flex flex-col gap-3 rounded-lg border bg-muted p-3">
          <h2 className="font-semibold">{t("registration.demoTitle")}</h2>
          <p className="text-sm">{t("registration.demoHint")}</p>
          {shouldAskPassword ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="bypass-password"
                className="text-sm font-medium"
              >
                {t("registration.verifyBypassPassword")}
              </label>
              <Input
                id="bypass-password"
                className="h-12"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          ) : null}
          <Button
            size="lg"
            variant="outline"
            disabled={isPending || (shouldAskPassword && !password)}
            onClick={() => void verifyWithoutEmail()}
            className="h-12 w-full"
          >
            {t("registration.verifyBypass")}
          </Button>
        </section>
      ) : null}
    </RegistrationLayout>
  )
}
