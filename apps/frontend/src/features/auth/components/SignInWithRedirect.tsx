import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import type { AccountType } from "@/features/auth/api/authSessionQueryOptions"
import { SignInForm } from "@/features/auth/components/SignInForm"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { decodeRedirectUri } from "@/features/auth/lib/redirect"

type SignInWithRedirectProps = {
  /** Encoded `from` search param set by `requireSession`. */
  from?: string
  /** Who may sign in here; the other account type is refused like a wrong password. */
  accountType: AccountType
  /** Area home used when there is no `from`. */
  fallback: string
  emailHint: string
}

export function SignInWithRedirect({
  from,
  accountType,
  fallback,
  emailHint,
}: SignInWithRedirectProps) {
  const { t } = useTranslation("auth")
  const navigate = useNavigate()
  const signIn = useSignIn(accountType)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setErrorMessage(null)
    try {
      await signIn.mutateAsync(values)
      await navigate({ to: from ? decodeRedirectUri(from) : fallback })
    } catch {
      // One generic message for any failure — never reveal whether the e-mail exists (US-02).
      setErrorMessage(t("form.errors.invalidCredentials"))
    }
  }

  return (
    <SignInForm
      emailHint={emailHint}
      isLoading={signIn.isPending}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
    />
  )
}
