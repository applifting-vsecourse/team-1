import { createFileRoute, notFound } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { HTTPError } from "@/lib/api-client"

import { submissionStatusQueryOptions } from "@/features/application-form/api/submissionStatus"
import { ApplicationLinkNotFound } from "@/features/application-form/components/ApplicationLinkNotFound"
import { SubmissionStatus } from "@/features/application-form/components/SubmissionStatus"

export const Route = createFileRoute("/apply/confirmation/$accessToken")({
  // Secret URL, so it survives a reload and can go in the e-mail. An unknown token is a 404.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(submissionStatusQueryOptions(params.accessToken))
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) throw notFound()
      throw error
    }
  },
  notFoundComponent: ApplicationLinkNotFound,
  component: ApplicationConfirmationPage,
})

// US-25
function ApplicationConfirmationPage() {
  const { accessToken } = Route.useParams()
  const { t } = useTranslation("applicationForm")

  return (
    <>
      <Seo title={t("confirmation.title")} />
      <PublicLayout>
        <SubmissionStatus accessToken={accessToken} />
      </PublicLayout>
    </>
  )
}
