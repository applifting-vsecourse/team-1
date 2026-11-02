import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { CapacityPage } from "@/features/event-overview/components/CapacityPage"
import { capacityQueryOptions } from "@/features/events/api/capacity"

export const Route = createFileRoute("/organizer/_app/events/$eventId/capacity")({
  validateSearch: (search: Record<string, unknown>): { termId?: string } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
  }),
  component: EventCapacityPage,
})

function EventCapacityPage() {
  const { eventId } = Route.useParams()
  const { termId } = Route.useSearch()
  // The rooms of the selected term only feed the room summary of its detail.
  const { data } = useQuery(capacityQueryOptions(eventId))
  return (
    <CapacityPage
      eventId={eventId}
      termId={termId}
      rooms={data?.terms.find((term) => term.termId === termId)?.rooms}
    />
  )
}
