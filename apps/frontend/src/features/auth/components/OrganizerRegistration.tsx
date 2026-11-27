import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Seo } from "@/components/atoms/Seo"
import { PasswordInput } from "@/components/molecules/PasswordInput"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { currentLanguage } from "@/i18n"

import { bypassTokenOf } from "@/features/auth/api/emailVerificationBypass"
import { CardFooterLinks } from "@/features/auth/components/CardFooterLinks"
import { MIN_PASSWORD_LENGTH, PasswordRule } from "@/features/auth/components/PasswordRule"
import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"
import { authClient } from "@/features/auth/lib/auth-client"

// Figma (Design system v2): Registrace organizátora / Účet · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27462-8762 (mobile 27462-8840)
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
  const isValidPassword = password.length >= MIN_PASSWORD_LENGTH

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
      <h1 className="text-2xl font-bold">{title}</h1>
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={isSubmitted && !isValidPassword}
            aria-describedby="registration-password-hint"
          />
          <PasswordRule
            id="registration-password-hint"
            password={password}
            hasError={isSubmitted && !isValidPassword}
          />
        </div>
        {failure ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{failure}</AlertTitle>
          </Alert>
        ) : null}
        <PendingButton
          isPending={isPending}
          type="submit"
          size="lg"
          className="w-full"
        >
          {t("registration.createAccount")}
        </PendingButton>
      </form>
      <CardFooterLinks
        question={t("registration.haveAccount")}
        links={[{ to: ROUTES.organizer.login, label: t("registration.signIn") }]}
      />
    </RegistrationLayout>
  )
}
