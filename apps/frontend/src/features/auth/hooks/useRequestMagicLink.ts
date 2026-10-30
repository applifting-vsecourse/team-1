import { useMutation } from "@tanstack/react-query"

import { currentLanguage } from "@/i18n"

import { authClient } from "@/features/auth/lib/auth-client"

/**
 * Asks for a new sign-in link. The server answers the same way whether or not
 * the e-mail has a participant account, so success never reveals anything.
 * The UI language goes along: the e-mail is written in it.
 */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.signIn.magicLink({
        email,
        metadata: { locale: currentLanguage() },
      })
      if (error) throw new Error(error.message ?? "Could not request the link")
    },
  })
}
