import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { CapacityPage as CapacityOverview } from "@/features/event-overview/components/CapacityPage"
import { CapacityPage } from "@/features/events/components/CapacityPage"

export const Route = createFileRoute("/organizer/_app/events/$eventId/capacity")({
  validateSearch: (search: Record<string, unknown>): { termId?: string } => ({
    termId: typeof search.termId === "string" ? search.termId : undefined,
  }),
  component: EventCapacityPage,
})

function EventCapacityPage() {
  const { eventId } = Route.useParams()
  const { termId } = Route.useSearch()
  const { data } = useQuery(occupancyQueryOptions(eventId))
  if (!termId || data?.roomMode !== "GENDERED") {
    return (
      <CapacityOverview
        eventId={eventId}
        termId={termId}
      />
    )
  }
  return (
    <CapacityPage
      eventId={eventId}
      initialTermId={termId}
    />
  )
}
