import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { HTTPError } from "@/lib/api-client"

import { publicEventQueryOptions } from "@/features/application-form/api/publicEvent"
import { ApplicationFormContainer } from "@/features/application-form/components/ApplicationFormContainer"
import { TermsList } from "@/features/application-form/components/TermsList"

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
  component: ApplicationFormPage,
})

// US-23. The price of the application and the saving come with US-40 / US-27.
function ApplicationFormPage() {
  const { token } = Route.useParams()
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(token))

  return (
    <>
      <Seo title={event.name} />
      <PublicLayout>
        <div className="flex flex-col gap-8">
          <PageHeader
            title={event.name}
            description={
              [event.location, event.description].filter(Boolean).join(" · ") || undefined
            }
          />
          <TermsList terms={event.terms} />
          <ApplicationFormContainer
            token={token}
            event={event}
          />
        </div>
      </PublicLayout>
    </>
  )
}
