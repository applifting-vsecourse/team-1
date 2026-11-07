import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"

import { EventOverview } from "@/features/event-overview/components/EventOverview"
import { eventsQueryOptions } from "@/features/events/api/events"
import { rememberLastOpenedEvent } from "@/features/events/api/last-opened-event"
import { EventSetup } from "@/features/events/components/EventSetup"

export const Route = createFileRoute("/organizer/_app/events/$eventId/")({
  component: EventOverviewPage,
})

// US-12 renders the head of the overview (link and what is missing); US-51 adds the switcher,
// what needs attention and the occupancy above it.
function EventOverviewPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("eventOverview")
  const navigate = useNavigate()
  const { data: events } = useQuery(eventsQueryOptions())

  // Opening the overview makes this the event login lands on next time (US-51).
  useEffect(() => {
    rememberLastOpenedEvent(eventId).catch(() => undefined)
  }, [eventId])

  return (
    <div className="flex flex-col gap-8">
      <Seo title={t("overview.title")} />
      <EventOverview
        eventId={eventId}
        events={events ?? []}
        onEventChange={(next) =>
          void navigate({ to: ROUTES.organizer.event, params: { eventId: next } })
        }
      />
      <EventSetup eventId={eventId} />
    </div>
  )
}
