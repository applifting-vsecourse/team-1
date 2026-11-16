import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { HTTPError } from "@/lib/api-client"

import { catalogEventQueryOptions } from "@/features/catalog/api/catalog"
import { EventNotFound } from "@/features/catalog/components/EventNotFound"
import { EventPage } from "@/features/catalog/components/EventPage"

export const Route = createFileRoute("/events/$publicToken")({
  // An unknown event, or one whose application link does not work, is a 404.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(catalogEventQueryOptions(params.publicToken))
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) throw notFound()
      throw error
    }
  },
  notFoundComponent: EventNotFound,
  component: CatalogEventRoute,
})

function CatalogEventRoute() {
  const { publicToken } = Route.useParams()
  const { data: event } = useSuspenseQuery(catalogEventQueryOptions(publicToken))

  return (
    <>
      <Seo title={event.name} />
      <PublicLayout isFullWidth>
        <div className="mx-auto w-full max-w-200 px-4 py-8 md:py-12">
          <EventPage event={event} />
        </div>
      </PublicLayout>
    </>
  )
}
