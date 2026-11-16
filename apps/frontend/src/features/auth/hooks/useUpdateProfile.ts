import { useMutation, useQueryClient } from "@tanstack/react-query"

import { i18n } from "@/i18n"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { updateProfile, type ProfileChange } from "@/features/auth/api/profile"

/**
 * Saves name and preferred language. The UI follows the saved language right
 * away, and the session is reloaded so the sidebar shows the new name. The API takes both
 * fields, so a change of the language alone (`name` left out) sends the name as it is saved now —
 * read fresh, so it doesn't overwrite a name changed in another tab or on another device.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (change: Omit<ProfileChange, "name"> & { name?: string }) => {
      const name =
        change.name ??
        (await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 }))?.user.name ??
        ""
      const saved = await updateProfile({ name, locale: change.locale })
      await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      await i18n.changeLanguage(saved.locale)
      return saved
    },
  })
}
