import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { EventSetup } from "@/features/events/components/EventSetup"

export const Route = createFileRoute("/organizer/_app/events/$eventId/")({
  component: EventOverviewPage,
})

// US-12 renders the head of the overview (link and what is missing); the
// occupancy and attention panels follow with US-29.
function EventOverviewPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("eventOverview")

  return (
    <>
      <Seo title={t("overview.title")} />
      <EventSetup eventId={eventId} />
    </>
  )
}
