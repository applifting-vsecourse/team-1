import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"

/**
 * Asks for a new sign-in link. The server answers the same way whether or not
 * the e-mail has a participant account, so success never reveals anything.
 */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.signIn.magicLink({ email })
      if (error) throw new Error(error.message ?? "Could not request the link")
    },
  })
}
