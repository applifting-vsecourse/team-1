import { useMutation } from "@tanstack/react-query"

import { submitApplication } from "@/features/application-form/api/submitApplication"
import type { ApplicationFormValues } from "@/features/application-form/lib/application-form-schema"

export function useSubmitApplication(token: string) {
  return useMutation({
    mutationFn: (values: ApplicationFormValues) => submitApplication(token, values),
  })
}
