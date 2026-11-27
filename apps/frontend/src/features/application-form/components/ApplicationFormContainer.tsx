import { useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { useConnectionFeedback } from "@/hooks/useConnectionFeedback"
import { apiErrorCode, HTTPError } from "@/lib/api-client"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"
import { useSubmitApplication } from "@/features/application-form/hooks/useSubmitApplication"
import { clearApplicationDraft } from "@/features/application-form/lib/application-draft"

// Error parameters are strings in both the API contract and the translation layer.
const duplicateSelection = z.object({
  params: z.object({
    participantIndex: z.string().regex(/^\d+$/).transform(Number),
    termId: z.string(),
    term: z.string(),
  }),
})

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
  useConnectionFeedback()
  const navigate = useNavigate()
  const submit = useSubmitApplication(token)

  return (
    <ApplicationForm
      event={event}
      draftKey={token}
      isDone={submit.isSuccess}
      errorMessage={submit.error?.message}
      isRateLimited={apiErrorCode(submit.error) === "TOO_MANY_REQUESTS"}
      onReview={() => submit.reset()}
      onSubmit={async (values) => {
        let accessToken: string
        try {
          const result = await submit.mutateAsync(values)
          accessToken = result.accessToken
        } catch (error) {
          if (apiErrorCode(error) === "APPLICATION_DUPLICATE" && error instanceof HTTPError) {
            const result = duplicateSelection.safeParse(error.data)
            return { duplicate: result.success ? result.data.params : null }
          }
          return
        }
        // Navigation can unmount the form before its success effect runs.
        clearApplicationDraft(token)
        await navigate({ to: ROUTES.applicationConfirmation, params: { accessToken } })
      }}
    />
  )
}
