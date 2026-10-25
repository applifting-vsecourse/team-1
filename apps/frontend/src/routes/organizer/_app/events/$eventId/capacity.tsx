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
  // The room list only feeds the room summary of a term's detail.
  const { data } = useQuery(capacityQueryOptions(eventId))
  return (
    <CapacityPage
      eventId={eventId}
      termId={termId}
      rooms={data?.rooms}
    />
  )
}
