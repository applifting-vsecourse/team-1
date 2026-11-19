import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"
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
  const { t } = useTranslation("auth")
  const { publicToken } = Route.useParams()
  const { data: event } = useSuspenseQuery(catalogEventQueryOptions(publicToken))

  return (
    <>
      <Seo title={event.name} />
      <PublicLayout
        isFullWidth
        headerContentClassName="md:min-h-[115px]"
        headerAction={
          <Button
            asChild
            variant="ghost"
          >
            <Link to={ROUTES.participant.login}>{t("form.submit")}</Link>
          </Button>
        }
      >
        <div className="mx-auto w-full max-w-[1196px] px-4 py-4 md:p-12">
          <EventPage event={event} />
        </div>
      </PublicLayout>
    </>
  )
}
