import { createFileRoute } from "@tanstack/react-router"

import { TransportForm } from "@/features/transport/components/TransportForm"

// Under the event (not nested in its transport list), so the page keeps the event header
// and the Transport tab stays active.
export const Route = createFileRoute("/organizer/_app/events/$eventId/transport_/new")({
  validateSearch: (search: Record<string, unknown>): { termId?: string } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
  }),
  component: NewTransportPage,
})

function NewTransportPage() {
  const { eventId } = Route.useParams()
  const { termId } = Route.useSearch()
  return (
    <TransportForm
      eventId={eventId}
      termId={termId}
    />
  )
}
