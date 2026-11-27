import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { OverpaymentsPage } from "@/features/event-overview/components/OverpaymentsPage"
import { eventQueryOptions } from "@/features/events/api/events"

export const Route = createFileRoute("/organizer/_app/events/$eventId/payments_/overpayments")({
  component: EventOverpaymentsRoute,
})

function EventOverpaymentsRoute() {
  const { eventId } = Route.useParams()
  const { data: event } = useQuery(eventQueryOptions(eventId))
  return (
    <OverpaymentsPage
      eventId={eventId}
      eventName={event?.name}
      terms={event?.terms ?? []}
    />
  )
}
