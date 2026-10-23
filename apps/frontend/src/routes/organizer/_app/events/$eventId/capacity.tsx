import { createFileRoute } from "@tanstack/react-router"

import { CapacityPage } from "@/features/event-overview/components/CapacityPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/capacity")({
  component: EventCapacityPage,
})

function EventCapacityPage() {
  const { eventId } = Route.useParams()
  return <CapacityPage eventId={eventId} />
}
