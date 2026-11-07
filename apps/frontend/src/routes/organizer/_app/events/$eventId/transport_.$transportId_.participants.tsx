import { createFileRoute } from "@tanstack/react-router"

import { TransportParticipants } from "@/features/transport/components/TransportParticipants"

export const Route = createFileRoute(
  "/organizer/_app/events/$eventId/transport_/$transportId_/participants",
)({
  validateSearch: (search: Record<string, unknown>): { termId?: string } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
  }),
  component: TransportParticipantsPage,
})

function TransportParticipantsPage() {
  const { eventId, transportId } = Route.useParams()
  const { termId } = Route.useSearch()
  return (
    <TransportParticipants
      eventId={eventId}
      transportId={transportId}
      termId={termId}
    />
  )
}
