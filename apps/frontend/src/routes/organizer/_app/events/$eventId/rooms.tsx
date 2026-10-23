import { createFileRoute } from "@tanstack/react-router"

import { RoomsPage } from "@/features/events/components/RoomsPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/rooms")({
  component: EventRoomsPage,
})

function EventRoomsPage() {
  const { eventId } = Route.useParams()
  return <RoomsPage eventId={eventId} />
}
