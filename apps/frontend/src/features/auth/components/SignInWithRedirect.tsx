import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { SignInForm } from "@/features/auth/components/SignInForm"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { decodeRedirectUri } from "@/features/auth/lib/redirect"

type SignInWithRedirectProps = {
  /** Encoded `from` search param set by `requireSession`. */
  from?: string
  /** Area home used when there is no `from`. */
  fallback: string
}

export function SignInWithRedirect({ from, fallback }: SignInWithRedirectProps) {
  const navigate = useNavigate()
  const signIn = useSignIn()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setErrorMessage(null)
    try {
      await signIn.mutateAsync(values)
      await navigate({ to: from ? decodeRedirectUri(from) : fallback })
    } catch {
      // One generic message for any failure — never reveal whether the e-mail exists (US-02).
      setErrorMessage("Nesprávný e-mail nebo heslo.")
    }
  }

  return (
    <SignInForm
      isLoading={signIn.isPending}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
    />
  )
}
