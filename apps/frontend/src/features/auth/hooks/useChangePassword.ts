import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"

/** BetterAuth answers a wrong current password with this code. */
export const INVALID_PASSWORD = "INVALID_PASSWORD"

export class ChangePasswordError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message)
  }
}

export type ChangePasswordValues = { currentPassword: string; newPassword: string }

/** US-124: changes the password through BetterAuth (current and new, at least 8 characters). */
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangePasswordValues) => {
      const { error } = await authClient.changePassword({ currentPassword, newPassword })
      if (error) {
        throw new ChangePasswordError(error.message ?? "Password change failed", error.code)
      }
    },
  })
}
