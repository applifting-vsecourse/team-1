import { useEffect } from "react"
import { hashKey, useQueryClient } from "@tanstack/react-query"

import { i18n } from "@/i18n"
import { authKeys } from "@/lib/auth-keys"

import type { Session } from "@/features/auth/api/authSessionQueryOptions"

/**
 * The app starts in the language the signed-in user chose in the account settings (D-069).
 * It is applied once per sign-in, when the session first shows up, so a language picked later
 * on a public page is not overridden on every refetch. A user who never chose one (null) keeps
 * the language the browser decided. Passive: it listens to the session cache and fetches nothing.
 */
export function useApplyPreferredLanguage(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let appliedFor: string | null = null

    const apply = (session: Session | undefined): void => {
      if (session === undefined) return
      if (session === null) {
        appliedFor = null
        return
      }
      if (appliedFor === session.user.id) return
      appliedFor = session.user.id
      const preferred = session.user.locale
      if (preferred && i18n.resolvedLanguage !== preferred) void i18n.changeLanguage(preferred)
    }

    apply(queryClient.getQueryData<Session>(authKeys.session()))
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash !== hashKey(authKeys.session())) return
      apply(event.query.state.data as Session | undefined)
    })
  }, [queryClient])
}
