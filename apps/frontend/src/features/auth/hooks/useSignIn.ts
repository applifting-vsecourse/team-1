import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import {
  authSessionQueryOptions,
  type AccountType,
} from "@/features/auth/api/authSessionQueryOptions"
import { authClient } from "@/features/auth/lib/auth-client"

type SignInInput = {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Signs in on one of the two login pages. `accountType` is the area the page
 * belongs to: valid credentials of the other kind are treated like wrong ones
 * (the session is ended again), so nobody lands on a 403 right after signing in.
 */
export function useSignIn(accountType: AccountType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: SignInInput) => {
      const { error } = await authClient.signIn.email({ email, password, rememberMe })
      if (error) throw new Error(error.message ?? "Sign in failed")

      // Load the new session now. Invalidating is not enough: the cache still
      // holds "signed out" and the guards of the next page would trust it.
      const session = await queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 })
      if (session?.user.accountType !== accountType) {
        await authClient.signOut()
        queryClient.setQueryData(authKeys.session(), null)
        throw new Error("Wrong account type for this sign-in page")
      }
    },
  })
}
