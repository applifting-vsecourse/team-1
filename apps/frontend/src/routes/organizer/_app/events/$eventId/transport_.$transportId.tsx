import { createFileRoute } from "@tanstack/react-router"

import { TransportForm } from "@/features/transport/components/TransportForm"

export const Route = createFileRoute("/organizer/_app/events/$eventId/transport_/$transportId")({
  component: EditTransportPage,
})

function EditTransportPage() {
  const { eventId, transportId } = Route.useParams()
  return (
    <TransportForm
      eventId={eventId}
      transportId={transportId}
    />
  )
}
