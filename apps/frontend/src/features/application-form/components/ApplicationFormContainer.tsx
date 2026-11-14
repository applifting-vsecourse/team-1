import { useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"
import { useSubmitApplication } from "@/features/application-form/hooks/useSubmitApplication"
import { clearApplicationDraft } from "@/features/application-form/lib/application-draft"

/**
 * Connects the form to the API and moves on to the confirmation page. Keyed by the link: a client
 * navigation from one application link to another may keep this component mounted, and the form
 * of the first event must not carry its entries (or its saved draft) over to the second.
 */
export function ApplicationFormContainer({ token, event }: { token: string; event: PublicEvent }) {
  return (
    <ApplicationFormForLink
      key={token}
      token={token}
      event={event}
    />
  )
}

function ApplicationFormForLink({ token, event }: { token: string; event: PublicEvent }) {
  const navigate = useNavigate()
  const submit = useSubmitApplication(token)

  return (
    <ApplicationForm
      event={event}
      draftKey={token}
      isDone={submit.isSuccess}
      errorMessage={submit.error?.message}
      onSubmit={async (values) => {
        const { accessToken } = await submit
          .mutateAsync(values)
          .catch(() => ({ accessToken: null }))
        if (accessToken) {
          // Right away, not in an effect after the re-render: the confirmation page may already
          // be on screen and the form gone before that effect would run.
          clearApplicationDraft(token)
          await navigate({ to: ROUTES.applicationConfirmation, params: { accessToken } })
        }
      }}
    />
  )
}
