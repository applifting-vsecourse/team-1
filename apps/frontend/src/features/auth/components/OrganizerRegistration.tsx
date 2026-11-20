import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Seo } from "@/components/atoms/Seo"
import { PasswordInput } from "@/components/molecules/PasswordInput"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { currentLanguage } from "@/i18n"

import { bypassTokenOf } from "@/features/auth/api/emailVerificationBypass"
import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"
import { authClient } from "@/features/auth/lib/auth-client"

// Figma v2: Vytvořit účet organizátora · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22456-10994 (mobile 22456-11097)
export function OrganizerRegistration() {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitted, setSubmitted] = useState(false)
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const isValidEmail = z.string().email().safeParse(email.trim()).success
  const isValidPassword = password.length >= 8

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setFailure(null)
    if (!isValidEmail || !isValidPassword) return

    setPending(true)
    const address = email.trim().toLowerCase()
    try {
      const callbackURL = `${window.location.origin}${ROUTES.organizer.verifyEmail}?email=${encodeURIComponent(address)}`
      const { data, error } = await authClient.signUp.email(
        { email: address, password, name: address, callbackURL },
        { headers: { "Accept-Language": currentLanguage() } },
      )
      if (error) {
        setFailure(error.status === 429 ? tErrors("TOO_MANY_REQUESTS") : t("registration.failed"))
        return
      }
      // The one-time token of the staging bypass (only present while it is on) travels in the history
      // state, never in the URL.
      await navigate({
        to: ROUTES.organizer.verifyEmail,
        search: { email: address },
        state: { bypassToken: bypassTokenOf(data) },
      })
    } catch {
      setFailure(t("registration.failed"))
    } finally {
      setPending(false)
    }
  }

  const title = t("registration.title")

  return (
    <RegistrationLayout>
      <Seo title={title} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p>{t("registration.description")}</p>
      </div>
      <BrandDivider />
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="registration-email"
            className="text-sm font-medium"
          >
            {t("registration.email")}
          </label>
          <Input
            id="registration-email"
            className="h-12"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={isSubmitted && !isValidEmail}
            placeholder={t("registration.emailPlaceholder")}
          />
          {isSubmitted && !isValidEmail ? (
            <p className="text-sm text-destructive">{t("registration.emailInvalidExample")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="registration-password"
            className="text-sm font-medium"
          >
            {t("registration.password")}
          </label>
          <PasswordInput
            id="registration-password"
            className="h-12"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={isSubmitted && !isValidPassword}
            aria-describedby="registration-password-hint"
          />
          <p
            id="registration-password-hint"
            className={
              isSubmitted && !isValidPassword
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {t("registration.passwordHint")}
          </p>
        </div>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <PendingButton
          isPending={isPending}
          type="submit"
          size="lg"
          className="h-12 w-full"
        >
          {t("registration.createAccount")}
        </PendingButton>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 w-full"
        >
          <Link to={ROUTES.organizer.login}>{t("registration.haveAccount")}</Link>
        </Button>
      </form>
    </RegistrationLayout>
  )
}
