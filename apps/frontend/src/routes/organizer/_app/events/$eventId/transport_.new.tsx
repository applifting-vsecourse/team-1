import { createFileRoute } from "@tanstack/react-router"

import { TransportForm } from "@/features/transport/components/TransportForm"

// Under the event (not nested in its transport list), so the page keeps the event header
// and the Transport tab stays active.
export const Route = createFileRoute("/organizer/_app/events/$eventId/transport_/new")({
  component: NewTransportPage,
})

function NewTransportPage() {
  const { eventId } = Route.useParams()
  return <TransportForm eventId={eventId} />
}
