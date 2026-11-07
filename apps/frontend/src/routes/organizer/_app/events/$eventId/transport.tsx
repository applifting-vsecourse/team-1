import { createFileRoute } from "@tanstack/react-router"

import { TransportList } from "@/features/transport/components/TransportList"

export const Route = createFileRoute("/organizer/_app/events/$eventId/transport")({
  component: TransportPage,
})

function TransportPage() {
  const { eventId } = Route.useParams()
  return <TransportList eventId={eventId} />
}
