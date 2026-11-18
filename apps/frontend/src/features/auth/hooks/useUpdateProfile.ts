import { useMutation, useQueryClient } from "@tanstack/react-query"

import { i18n } from "@/i18n"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { updateProfile, type ProfileChange } from "@/features/auth/api/profile"

/**
 * Saves the name and/or the preferred language; the API changes only what is sent. The UI follows
 * a saved language right away, and the session is reloaded so the sidebar shows the new name.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (change: ProfileChange) => {
      const saved = await updateProfile(change)
      await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      if (change.locale && saved.locale) await i18n.changeLanguage(saved.locale)
      return saved
    },
  })
}
