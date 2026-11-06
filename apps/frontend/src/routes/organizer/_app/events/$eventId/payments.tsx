import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { PaymentsOverviewPage } from "@/features/event-overview/components/PaymentsOverviewPage"
import { eventQueryOptions } from "@/features/events/api/events"

export const Route = createFileRoute("/organizer/_app/events/$eventId/payments")({
  component: EventPaymentsPage,
})

function EventPaymentsPage() {
  const { eventId } = Route.useParams()
  const { data: event } = useQuery(eventQueryOptions(eventId))
  return (
    <PaymentsOverviewPage
      eventId={eventId}
      eventName={event?.name}
    />
  )
}
