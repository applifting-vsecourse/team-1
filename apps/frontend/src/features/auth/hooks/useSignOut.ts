import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"
import { notify } from "@/lib/notify"

import { authClient } from "@/features/auth/lib/auth-client"

export function useSignOut() {
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
      await navigate({ to: ROUTES.home })
    },
    // Sign-out is started from a menu, which has no form to show the error in.
    onError: () => notify.error(t("menu.signOutFailed")),
  })
}
