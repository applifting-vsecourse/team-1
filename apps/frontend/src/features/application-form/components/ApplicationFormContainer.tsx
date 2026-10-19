import { useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"
import { useSubmitApplication } from "@/features/application-form/hooks/useSubmitApplication"

/** Connects the form to the API and moves on to the confirmation page. */
export function ApplicationFormContainer({ token, event }: { token: string; event: PublicEvent }) {
  const navigate = useNavigate()
  const submit = useSubmitApplication(token)

  return (
    <ApplicationForm
      event={event}
      isDone={submit.isSuccess}
      errorMessage={submit.error?.message}
      onSubmit={async (values) => {
        const { accessToken } = await submit
          .mutateAsync(values)
          .catch(() => ({ accessToken: null }))
        if (accessToken) {
          await navigate({ to: ROUTES.applicationConfirmation, params: { accessToken } })
        }
      }}
    />
  )
}
