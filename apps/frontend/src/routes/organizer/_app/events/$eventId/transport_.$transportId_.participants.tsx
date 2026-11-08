import { createFileRoute } from "@tanstack/react-router"

import { TransportParticipants } from "@/features/transport/components/TransportParticipants"

export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/transport_/$transportId_/participants",
)({
  component: TransportParticipantsPage,
})

function TransportParticipantsPage() {
  const { eventId, transportId } = Route.useParams()
  return (
    <TransportParticipants
      eventId={eventId}
      transportId={transportId}
    />
  )
}
