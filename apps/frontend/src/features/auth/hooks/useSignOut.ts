import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"
import { notify } from "@/lib/notify"

import { authClient } from "@/features/auth/lib/auth-client"

/**
 * Signs out and leaves for the landing page, or for `to` with `search` (the 403 „Přihlásit se
 * jiným účtem“ goes to the organizer sign-in and back to the page afterwards).
 */
export function useSignOut({
  to = ROUTES.home,
  search,
}: { to?: string; search?: Record<string, string> } = {}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation("auth")

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut()
      if (error) throw new Error(error.message ?? "Sign out failed")
    },
    onSuccess: async () => {
      // Nothing of the previous account may linger in the cache.
      queryClient.clear()
      queryClient.setQueryData(authKeys.session(), null)
      await navigate(search ? { to, search, ignoreBlocker: true } : { to, ignoreBlocker: true })
    },
    // Sign-out is started from a menu, which has no form to show the error in.
    onError: () => notify.error(t("menu.signOutFailedTitle"), t("menu.signOutFailedDescription")),
  })
}
