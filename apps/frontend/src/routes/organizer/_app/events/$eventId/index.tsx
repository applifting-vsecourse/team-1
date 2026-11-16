import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"

import { EventOverview } from "@/features/event-overview/components/EventOverview"
import { eventQueryOptions, eventsQueryOptions } from "@/features/events/api/events"
import { rememberLastOpenedEvent } from "@/features/events/api/last-opened-event"
import { EventSetup } from "@/features/events/components/EventSetup"

export const Route = createFileRoute("/organizer/_app/events/$eventId/")({
  component: EventOverviewPage,
})

// US-12 renders the link and what is missing; US-51 adds the switcher, what needs attention and
// the occupancy. While the event still needs setup before its link can be shared, the setup steps
// come first (#314, Adam in PR #392); otherwise they stay below the overview.
function EventOverviewPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation("eventOverview")
  const navigate = useNavigate()
  const { data: events } = useQuery(eventsQueryOptions())
  const { data: event } = useQuery(eventQueryOptions(eventId))
  const isSetupPending = event !== undefined && !event.applicationsOpen

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
        setup={isSetupPending ? <EventSetup eventId={eventId} /> : undefined}
      />
      {isSetupPending ? null : <EventSetup eventId={eventId} />}
    </div>
  )
}
