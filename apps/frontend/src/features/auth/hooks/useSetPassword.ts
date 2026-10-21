import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { setPassword } from "@/features/auth/api/setPassword"

/**
 * Sets the participant's first password. The session stays valid; it is
 * reloaded afterwards because it still says `mustSetPassword` — the guards of
 * the next page would otherwise send the participant straight back here.
 */
export function useSetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string) => {
      await setPassword(password)
      await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
    },
  })
}
