import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { HTTPError } from "@/lib/api-client"

import { publicEventQueryOptions } from "@/features/application-form/api/publicEvent"
import { ApplicationFormContainer } from "@/features/application-form/components/ApplicationFormContainer"
import { ApplicationLinkNotFound } from "@/features/application-form/components/ApplicationLinkNotFound"

export const Route = createFileRoute("/apply/$token")({
  // An unknown link — or an event that has no term or room yet — is a 404.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(publicEventQueryOptions(params.token))
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) throw notFound()
      throw error
    }
  },
  notFoundComponent: ApplicationLinkNotFound,
  component: ApplicationFormPage,
})

// US-23. The price of the application and the saving come with US-40 / US-27.
// Figma (Design system): V07 .../?node-id=12666-2538 (desktop), M02 .../?node-id=12666-18727 (360 px).
function ApplicationFormPage() {
  const { token } = Route.useParams()
  const { t } = useTranslation("applicationForm")
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(token))

  return (
    <>
      <Seo title={t("form.heading", { event: event.name })} />
      <PublicLayout
        isFullWidth
        headerContentClassName="max-w-288"
      >
        <div className="mx-auto w-full max-w-[1248px] px-4 py-4 md:p-12">
          <ApplicationFormContainer
            token={token}
            event={event}
          />
        </div>
      </PublicLayout>
    </>
  )
}
