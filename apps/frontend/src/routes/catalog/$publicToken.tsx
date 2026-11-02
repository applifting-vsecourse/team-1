import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { NotFoundPage } from "@/components/pages/NotFoundPage"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { HTTPError } from "@/lib/api-client"

import { catalogEventQueryOptions } from "@/features/catalog/api/catalog"
import { EventPage } from "@/features/catalog/components/EventPage"

export const Route = createFileRoute("/catalog/$publicToken")({
  // An unknown or not published event is a 404.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(catalogEventQueryOptions(params.publicToken))
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) throw notFound()
      throw error
    }
  },
  notFoundComponent: NotFoundPage,
  component: CatalogEventRoute,
})

function CatalogEventRoute() {
  const { publicToken } = Route.useParams()
  const { data: event } = useSuspenseQuery(catalogEventQueryOptions(publicToken))

  return (
    <>
      <Seo title={event.name} />
      <PublicLayout isFullWidth>
        <div className="mx-auto w-full max-w-275 px-4 py-8 md:p-12">
          <EventPage event={event} />
        </div>
      </PublicLayout>
    </>
  )
}
