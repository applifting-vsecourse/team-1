import { useMutation } from "@tanstack/react-query"

import { requestEmailChange } from "@/features/auth/api/emailChange"

export function useRequestEmailChange() {
  return useMutation({ mutationFn: (newEmail: string) => requestEmailChange(newEmail) })
}
